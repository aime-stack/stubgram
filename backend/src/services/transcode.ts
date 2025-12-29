import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configure ffmpeg
ffmpeg.setFfmpegPath(installer.path);

export class TranscodeService {
    private static _supabase: any = null;

    private static get supabase() {
        if (this._supabase) return this._supabase;
        
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('TranscodeService: Missing Supabase URL or Service Role Key in environment.');
        }

        this._supabase = createClient(supabaseUrl, supabaseServiceKey);
        return this._supabase;
    }
    
    static async processPendingReels() {
        // Fetch 1 pending reel from posts table
        const { data: reels, error } = await this.supabase
            .from('posts')
            .select('*')
            .eq('type', 'reel')
            .eq('processing_status', 'PENDING')
            .limit(1);

        if (error || !reels || reels.length === 0) return;

        const reel = reels[0];
        console.log(`[Transcode] Starting job for Reel ${reel.id}`);

        // Mark as PROCESSING
        await this.supabase.from('posts').update({ processing_status: 'PROCESSING' }).eq('id', reel.id);

        try {
            // 1. Download
            // Logic: we need the path. Assuming original_url or video_url contains it.
            // If original_url is missing (old reels), use video_url.
            const urlToProcess = reel.original_url || reel.video_url;
            if (!urlToProcess) throw new Error('No URL to process');

            // Extract path from URL (naive approach, better to store path in DB)
            // URL: https://.../storage/v1/object/public/reels/path/to/file.mp4
            // Path: path/to/file.mp4
            // This regex is a bit fragile, relies on standard Supabase URL structure
            const pathMatch = urlToProcess.match(/reels\/(.+)$/);
            const storagePath = pathMatch ? pathMatch[1] : null;

            if (!storagePath) throw new Error(`Could not parse storage path from ${urlToProcess}`);

            const localInput = path.join(os.tmpdir(), `input_${reel.id}.mp4`);
            const localOutput = path.join(os.tmpdir(), `output_${reel.id}.mp4`);

            console.log(`[Transcode] Downloading ${storagePath}...`);
            const { data: downloadData, error: downloadError } = await this.supabase.storage
                .from('reels')
                .download(storagePath);

            if (downloadError) throw downloadError;

            // Save to temp
            await fs.promises.writeFile(localInput, Buffer.from(await downloadData.arrayBuffer()));

            // 2. Transcode & Watermark
            console.log(`[Transcode] Encoding options: 720p, H.264, Watermark...`);
            const watermarkPath = path.resolve(process.cwd(), 'assets', 'watermark.png');
            
            await new Promise((resolve, reject) => {
                ffmpeg(localInput)
                    .input(watermarkPath)
                    .complexFilter([
                        // Scale the watermark to be about 15% width of the video
                        '[1:v]scale=iw*0.15:-1[wm]',
                        // Overlay at top-right with 10px padding
                        '[0:v][wm]overlay=main_w-overlay_w-10:10[outv]'
                    ], 'outv')
                    .outputOptions([
                        '-c:v libx264',
                        '-crf 23',
                        '-preset veryfast',
                        '-c:a aac',
                        '-b:a 128k',
                        '-movflags +faststart'
                    ])
                    .save(localOutput)
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.error('[FFMPEG Error]', err);
                        reject(err);
                    });
            });

            // 3. Upload Optimized
            const optimizedPath = storagePath.replace(/(\.[\w\d_-]+)$/i, '_720p.mp4');
            console.log(`[Transcode] Uploading to ${optimizedPath}...`);
            
            const fileBuffer = await fs.promises.readFile(localOutput);
            const { error: uploadError } = await this.supabase.storage
                .from('reels')
                .upload(optimizedPath, fileBuffer, {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: publicUrlData } = this.supabase.storage.from('reels').getPublicUrl(optimizedPath);
            const optimizedUrl = publicUrlData.publicUrl;

            // 4. Update DB
            await this.supabase.from('posts').update({
                processing_status: 'READY',
                processed_url: optimizedUrl,
                video_url: optimizedUrl, // Update main URL to improved version
                original_url: urlToProcess, // Ensure original is kept if not already
                resolution: '720p',
                watermark_applied: true
            }).eq('id', reel.id);

            console.log(`[Transcode] Success for Reel ${reel.id}`);

            // Cleanup
            await fs.promises.unlink(localInput).catch(() => {});
            await fs.promises.unlink(localOutput).catch(() => {});

        } catch (err: any) {
            console.error(`[Transcode] Failed for Reel ${reel.id}:`, err);
            await this.supabase.from('posts').update({ 
                processing_status: 'FAILED',
                // metadata: { error: err.message } // If we had metadata col
            }).eq('id', reel.id);
        }
    }
}
