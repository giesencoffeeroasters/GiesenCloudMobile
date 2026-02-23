import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle as SvgCircle, Line } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import apiClient from "@/api/client";
import type { KBArticle, KBCategoryStats } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgCircle
        cx={11}
        cy={11}
        r={8}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={21}
        y1={21}
        x2={16.65}
        y2={16.65}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function KnowledgeBaseScreen() {
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  /* ── Debounced search ── */
  useEffect(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, [search]);

  /* ── Fetch categories ── */
  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get("/knowledge-base/categories");
      setCategories(response.data.data ?? response.data ?? []);
    } catch (error) {
      console.error("Failed to fetch KB categories:", error);
    }
  }, []);

  /* ── Fetch articles ── */
  const fetchArticles = useCallback(
    async (pageNum: number = 1, isRefresh: boolean = false) => {
      try {
        const params: Record<string, string | number> = {
          per_page: 20,
          page: pageNum,
        };
        if (debouncedSearch.trim()) {
          params.search = debouncedSearch.trim();
        }
        if (activeCategory !== "all") {
          params.category = activeCategory;
        }

        const response = await apiClient.get("/knowledge-base/questions", {
          params,
        });

        const responseData = response.data.data ?? response.data;
        const items: KBArticle[] = responseData.data ?? responseData ?? [];
        const lastPage = responseData.last_page ?? 1;

        if (isRefresh || pageNum === 1) {
          setArticles(items);
        } else {
          setArticles((prev) => [...prev, ...items]);
        }

        setHasMore(pageNum < lastPage);
        setPage(pageNum);
      } catch (error) {
        console.error("Failed to fetch KB articles:", error);
      }
    },
    [debouncedSearch, activeCategory]
  );

  /* ── Load data on focus ── */
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      setIsLoading(true);
      fetchArticles(1, true).finally(() => setIsLoading(false));
    }, [fetchArticles, fetchCategories])
  );

  /* ── Refetch when search/category changes ── */
  useEffect(() => {
    setIsLoading(true);
    fetchArticles(1, true).finally(() => setIsLoading(false));
  }, [debouncedSearch, activeCategory]);

  /* ── Pull to refresh ── */
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchCategories(), fetchArticles(1, true)]);
    setIsRefreshing(false);
  }, [fetchCategories, fetchArticles]);

  /* ── Infinite scroll ── */
  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchArticles(page + 1).finally(() => setLoadingMore(false));
  }, [hasMore, loadingMore, page, fetchArticles]);

  /* ── Category press ── */
  const onCategoryPress = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  /* ── Navigate to article ── */
  const onArticlePress = useCallback((article: KBArticle) => {
    router.push({
      pathname: "/knowledge-base/[id]",
      params: {
        id: article.articleId,
        articleData: JSON.stringify(article),
      },
    });
  }, []);

  /* ── Render article card ── */
  const renderArticle = useCallback(
    ({ item }: { item: KBArticle }) => (
      <TouchableOpacity
        style={styles.articleCard}
        activeOpacity={0.7}
        onPress={() => onArticlePress(item)}
      >
        <Text style={styles.articleQuestion} numberOfLines={2}>
          {item.question}
        </Text>

        <View style={styles.badgeRow}>
          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          ) : null}
          {item.roaster ? (
            <View style={styles.roasterBadge}>
              <Text style={styles.roasterBadgeText}>{item.roaster}</Text>
            </View>
          ) : null}
        </View>

        {item.answer ? (
          <Text style={styles.articleAnswer} numberOfLines={2}>
            {item.answer}
          </Text>
        ) : null}
      </TouchableOpacity>
    ),
    [onArticlePress]
  );

  /* ── Empty state ── */
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    const hasSearchOrFilter =
      debouncedSearch.trim().length > 0 || activeCategory !== "all";

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          {hasSearchOrFilter
            ? "No articles match your search."
            : "No articles available yet."}
        </Text>
      </View>
    );
  }, [isLoading, debouncedSearch, activeCategory]);

  /* ── Footer loader ── */
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.textSecondary} />
      </View>
    );
  }, [loadingMore]);

  /* ── Loading state ── */
  if (isLoading && articles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.gLogo}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Knowledge Base</Text>
              <Text style={styles.headerSubtitle}>Search Articles</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.slate} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark slate header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.gLogo}>
            <GiesenLogo size={18} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Knowledge Base</Text>
            <Text style={styles.headerSubtitle}>Search Articles</Text>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <SearchIcon color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search articles..."
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            activeCategory === "all" && styles.filterChipActive,
          ]}
          activeOpacity={0.7}
          onPress={() => onCategoryPress("all")}
        >
          <Text
            style={[
              styles.filterChipText,
              activeCategory === "all" && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.category}
            style={[
              styles.filterChip,
              activeCategory === cat.category && styles.filterChipActive,
            ]}
            activeOpacity={0.7}
            onPress={() => onCategoryPress(cat.category)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeCategory === cat.category && styles.filterChipTextActive,
              ]}
            >
              {cat.category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Article list */}
      <FlatList
        data={articles}
        keyExtractor={(item) => item.articleId}
        renderItem={renderArticle}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          articles.length === 0 && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* -- Header -- */
  header: {
    backgroundColor: Colors.slate,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.safety,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: "#ffffff",
  },
  headerSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginTop: 1,
  },

  /* -- Search bar -- */
  searchSection: {
    backgroundColor: Colors.slate,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.headerOverlay,
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: "#ffffff",
    paddingVertical: 10,
  },

  /* -- Filter chips -- */
  filterRow: {
    maxHeight: 48,
    backgroundColor: Colors.bg,
  },
  filterRowContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.gravelLight,
  },
  filterChipActive: {
    backgroundColor: Colors.sky,
  },
  filterChipText: {
    fontFamily: "DMSans-Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: "#ffffff",
  },

  /* -- List -- */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },

  /* -- Article card -- */
  articleCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  articleQuestion: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryBadge: {
    backgroundColor: Colors.skyBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.sky,
  },
  roasterBadge: {
    backgroundColor: Colors.sunBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roasterBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.sun,
  },
  articleAnswer: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  /* -- Empty state -- */
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textTertiary,
  },

  /* -- Footer -- */
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
