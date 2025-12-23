
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Course } from '@/types';
import { apiClient } from '@/services/api';

export default function CoursesScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab: string }>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'enrolled'>((tab as 'all' | 'enrolled') || 'all');

  useEffect(() => {
    if (tab && (tab === 'all' || tab === 'enrolled')) {
      setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    loadCourses();
  }, [activeTab]);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const filter = activeTab === 'enrolled' ? 'enrolled' : 'all';
      const response = await apiClient.getCourses(filter);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => router.push(`/courses/${item.id}`)}
    >
      <Image
        source={{ uri: item.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400' }}
        style={styles.courseThumbnail}
      />
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.courseTeacher} numberOfLines={1}>
          by {item.teacher.username}
        </Text>
        <View style={styles.courseStats}>
          <View style={styles.courseStat}>
            <IconSymbol
              ios_icon_name="person.2"
              android_material_icon_name="people"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.courseStatText}>{item.studentsCount}</Text>
          </View>
          <View style={styles.courseStat}>
            <IconSymbol
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={16}
              color={colors.accent}
            />
            <Text style={styles.courseStatText}>{item.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.courseStat}>
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="schedule"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.courseStatText}>{item.duration}</Text>
          </View>
        </View>
        <View style={styles.courseFooter}>
          <Text style={styles.coursePrice}>{item.price} 🪙</Text>
          {item.isEnrolled && (
            <View style={styles.enrolledBadge}>
              <Text style={styles.enrolledText}>Enrolled</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Courses</Text>
        <TouchableOpacity
          style={styles.becomeTeacherButton}
          onPress={() => router.push('/become-teacher')}
        >
          <Text style={styles.becomeTeacherText}>Become Teacher</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Courses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'enrolled' && styles.tabActive]}
          onPress={() => setActiveTab('enrolled')}
        >
          <Text style={[styles.tabText, activeTab === 'enrolled' && styles.tabTextActive]}>
            My Courses
          </Text>
        </TouchableOpacity>
      </View>

      {/* Courses List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </View>
  );
}

function getMockCourses(): Course[] {
  return [
    {
      id: '1',
      title: 'Complete React Native Development',
      description: 'Learn to build mobile apps from scratch',
      teacherId: '1',
      teacher: {
        id: '1',
        username: 'johndoe',
        email: 'john@example.com',
        isVerified: true,
        isCelebrity: false,
        followersCount: 1234,
        followingCount: 567,
        postsCount: 89,
        createdAt: new Date().toISOString(),
      },
      price: 500,
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
      duration: '12h 30m',
      studentsCount: 1234,
      rating: 4.8,
      isEnrolled: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'UI/UX Design Masterclass',
      description: 'Master the art of user interface design',
      teacherId: '2',
      teacher: {
        id: '2',
        username: 'janedoe',
        email: 'jane@example.com',
        isVerified: true,
        isCelebrity: false,
        followersCount: 5678,
        followingCount: 234,
        postsCount: 156,
        createdAt: new Date().toISOString(),
      },
      price: 750,
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400',
      duration: '8h 45m',
      studentsCount: 892,
      rating: 4.9,
      isEnrolled: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.xxl + 20 : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  becomeTeacherButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  becomeTeacherText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  courseCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  courseThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: colors.border,
  },
  courseInfo: {
    padding: spacing.md,
  },
  courseTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  courseTeacher: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  courseStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  courseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  courseStatText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coursePrice: {
    ...typography.body,
    fontWeight: '700',
    color: colors.accent,
  },
  enrolledBadge: {
    backgroundColor: colors.highlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  enrolledText: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
