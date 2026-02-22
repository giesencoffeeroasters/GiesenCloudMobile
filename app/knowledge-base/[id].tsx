import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { GiesenLogo } from "@/components/GiesenLogo";
import type { KBArticle } from "@/types/index";

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 19l-7-7 7-7"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  HTML Rendering Helpers                                             */
/* ------------------------------------------------------------------ */

interface HtmlNode {
  type: "text" | "element";
  tag?: string;
  content?: string;
  children?: HtmlNode[];
}

function parseSimpleHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let lastIndex = 0;
  let match;

  const stack: { tag: string; children: HtmlNode[] }[] = [];
  let currentChildren = nodes;

  while ((match = tagRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullMatch.startsWith("</");
    const isSelfClosing = fullMatch.endsWith("/>") || tagName === "br";

    // Add any text before this tag
    if (match.index > lastIndex) {
      const textContent = html
        .slice(lastIndex, match.index)
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
      if (textContent.trim()) {
        currentChildren.push({ type: "text", content: textContent });
      }
    }

    if (isSelfClosing || tagName === "br") {
      if (tagName === "br") {
        currentChildren.push({ type: "text", content: "\n" });
      }
    } else if (isClosing) {
      // Pop the stack
      if (stack.length > 0) {
        const popped = stack.pop()!;
        currentChildren =
          stack.length > 0 ? stack[stack.length - 1].children : nodes;
      }
    } else {
      // Opening tag
      const newNode: HtmlNode = {
        type: "element",
        tag: tagName,
        children: [],
      };
      currentChildren.push(newNode);
      stack.push({ tag: tagName, children: newNode.children! });
      currentChildren = newNode.children!;
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Remaining text
  if (lastIndex < html.length) {
    const remaining = html
      .slice(lastIndex)
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    if (remaining.trim()) {
      nodes.push({ type: "text", content: remaining });
    }
  }

  return nodes;
}

function RenderHtmlNodes({
  nodes,
  depth = 0,
}: {
  nodes: HtmlNode[];
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "text") {
          return (
            <Text key={index} style={htmlStyles.bodyText}>
              {node.content}
            </Text>
          );
        }

        const tag = node.tag;
        const children = node.children ?? [];

        switch (tag) {
          case "h1":
          case "h2":
          case "h3":
          case "h4":
          case "h5":
          case "h6":
            return (
              <Text key={index} style={htmlStyles.heading}>
                <RenderHtmlNodes nodes={children} depth={depth + 1} />
              </Text>
            );

          case "strong":
          case "b":
            return (
              <Text key={index} style={htmlStyles.bold}>
                <RenderHtmlNodes nodes={children} depth={depth + 1} />
              </Text>
            );

          case "em":
          case "i":
            return (
              <Text key={index} style={htmlStyles.italic}>
                <RenderHtmlNodes nodes={children} depth={depth + 1} />
              </Text>
            );

          case "p":
            return (
              <Text key={index} style={htmlStyles.paragraph}>
                <RenderHtmlNodes nodes={children} depth={depth + 1} />
              </Text>
            );

          case "ul":
            return (
              <View key={index} style={htmlStyles.list}>
                <RenderHtmlNodes nodes={children} depth={depth + 1} />
              </View>
            );

          case "ol":
            return (
              <View key={index} style={htmlStyles.list}>
                {children.map((child, i) => {
                  if (child.type === "element" && child.tag === "li") {
                    return (
                      <View key={i} style={htmlStyles.listItem}>
                        <Text style={htmlStyles.listBullet}>{i + 1}.</Text>
                        <Text style={htmlStyles.listItemText}>
                          <RenderHtmlNodes
                            nodes={child.children ?? []}
                            depth={depth + 2}
                          />
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <RenderHtmlNodes
                      key={i}
                      nodes={[child]}
                      depth={depth + 1}
                    />
                  );
                })}
              </View>
            );

          case "li":
            return (
              <View key={index} style={htmlStyles.listItem}>
                <Text style={htmlStyles.listBullet}>{"\u2022"}</Text>
                <Text style={htmlStyles.listItemText}>
                  <RenderHtmlNodes nodes={children} depth={depth + 1} />
                </Text>
              </View>
            );

          default:
            return (
              <Text key={index} style={htmlStyles.bodyText}>
                <RenderHtmlNodes nodes={children} depth={depth + 1} />
              </Text>
            );
        }
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function KnowledgeBaseDetailScreen() {
  const { id, articleData } = useLocalSearchParams<{
    id: string;
    articleData: string;
  }>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const article: KBArticle | null = useMemo(() => {
    if (!articleData) return null;
    try {
      return JSON.parse(articleData);
    } catch {
      return null;
    }
  }, [articleData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Data is passed via params; just dismiss the spinner
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  /* ── Parsed HTML body ── */
  const htmlNodes = useMemo(() => {
    if (!article?.hs_body) return null;
    return parseSimpleHtml(article.hs_body);
  }, [article?.hs_body]);

  /* ── Header ── */
  function renderHeader() {
    return (
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <BackIcon />
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <GiesenLogo size={18} color={Colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSubtitle}>Knowledge Base</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Article
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* ── No data ── */
  if (!article) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>Article not found.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.slate}
          />
        }
      >
        {/* Article title */}
        <Text style={styles.articleTitle}>{article.question}</Text>

        {/* Badge row */}
        <View style={styles.badgeRow}>
          {article.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{article.category}</Text>
            </View>
          ) : null}
          {article.roaster ? (
            <View style={styles.roasterBadge}>
              <Text style={styles.roasterBadgeText}>{article.roaster}</Text>
            </View>
          ) : null}
        </View>

        {/* Article body */}
        <View style={styles.bodyCard}>
          {htmlNodes && htmlNodes.length > 0 ? (
            <RenderHtmlNodes nodes={htmlNodes} />
          ) : article.answer ? (
            <Text style={styles.bodyText}>{article.answer}</Text>
          ) : (
            <Text style={styles.emptyText}>No content available.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  HTML element styles                                                */
/* ------------------------------------------------------------------ */

const htmlStyles = StyleSheet.create({
  bodyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  heading: {
    fontFamily: "DMSans-Bold",
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  bold: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  italic: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    fontStyle: "italic",
  },
  paragraph: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  list: {
    marginBottom: 12,
    gap: 4,
  },
  listItem: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 4,
  },
  listBullet: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    width: 16,
  },
  listItemText: {
    flex: 1,
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
});

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* -- Header -- */
  header: {
    backgroundColor: Colors.slate,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.headerOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.safety,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 18,
    color: "#ffffff",
    lineHeight: 22,
  },
  headerSubtitle: {
    fontFamily: "DMSans-Regular",
    fontSize: 12,
    color: Colors.gravel,
    marginBottom: 2,
  },

  /* -- Loading / Error -- */
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontFamily: "DMSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.slate,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontFamily: "DMSans-Medium",
    fontSize: 14,
    color: "#ffffff",
  },

  /* -- Content -- */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  /* -- Article title -- */
  articleTitle: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 20,
    color: Colors.text,
    lineHeight: 28,
  },

  /* -- Badges -- */
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryBadge: {
    backgroundColor: Colors.skyBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.sky,
  },
  roasterBadge: {
    backgroundColor: Colors.sunBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roasterBadgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: Colors.sun,
  },

  /* -- Body card -- */
  bodyCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  bodyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  emptyText: {
    fontFamily: "DMSans-Regular",
    fontSize: 13,
    color: Colors.textTertiary,
    fontStyle: "italic",
  },
});
