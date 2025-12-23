import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export type NetworkState = {
    isConnected: boolean;
    type: Network.NetworkStateType;
    isInternetReachable: boolean | undefined;
};

/**
 * Hook to monitor network connectivity and quality.
 * Specifically tuned for unstable mobile environments.
 */
export function useNetworkQuality() {
    const [networkState, setNetworkState] = useState<NetworkState>({
        isConnected: true,
        type: Network.NetworkStateType.UNKNOWN,
        isInternetReachable: true,
    });

    useEffect(() => {
        let isMounted = true;

        async function checkInitial() {
            const state = await Network.getNetworkStateAsync();
            if (isMounted) {
                setNetworkState({
                    isConnected: state.isConnected ?? false,
                    type: state.type ?? Network.NetworkStateType.UNKNOWN,
                    isInternetReachable: state.isInternetReachable,
                });
            }
        }

        checkInitial();

        // In Expo Go, there's no native listener for network state changes in some versions,
        // so we poll every 5s for reliability if we're not using a specific library.
        // However, expo-network state is generally reliable on real devices.
        const interval = setInterval(async () => {
            const state = await Network.getNetworkStateAsync();
            if (isMounted) {
                setNetworkState({
                    isConnected: state.isConnected ?? false,
                    type: state.type ?? Network.NetworkStateType.UNKNOWN,
                    isInternetReachable: state.isInternetReachable,
                });
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return networkState;
}
