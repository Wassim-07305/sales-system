"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Presentation, PresentationSlide } from "@/lib/types/database";

interface PresentationPDFProps {
  presentation: Presentation;
  slides: PresentationSlide[];
}

const themeStyles = {
  dark: { bg: "#14080e", text: "#ffffff", accent: "#7af17a", muted: "#a0a0a0" },
  light: {
    bg: "#ffffff",
    text: "#111827",
    accent: "#7af17a",
    muted: "#6b7280",
  },
  brand: {
    bg: "#14080e",
    text: "#ffffff",
    accent: "#7af17a",
    muted: "#a0a0a0",
  },
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    flexDirection: "column",
    justifyContent: "center",
  },
  titleSlide: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  body: {
    fontSize: 13,
    lineHeight: 1.6,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 1.8,
    marginLeft: 16,
  },
  bulletDot: {
    marginRight: 8,
  },
  quote: {
    fontSize: 20,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  quoteAuthor: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 8,
  },
  twoColumns: {
    flexDirection: "row",
    gap: 20,
    flex: 1,
  },
  column: {
    flex: 1,
    fontSize: 13,
    lineHeight: 1.6,
  },
  image: {
    width: "100%",
    maxHeight: 300,
    objectFit: "contain",
    marginVertical: 12,
  },
  imageRow: {
    flexDirection: "row",
    gap: 20,
    flex: 1,
    alignItems: "center",
  },
  imageCol: {
    width: "40%",
  },
  textCol: {
    width: "60%",
  },
  chartPlaceholder: {
    height: 200,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  chartText: {
    fontSize: 14,
    opacity: 0.5,
  },
  slideNumber: {
    position: "absolute",
    bottom: 20,
    right: 30,
    fontSize: 10,
    opacity: 0.4,
  },
});

function SlidePageContent({
  slide,
  colors,
}: {
  slide: PresentationSlide;
  colors: (typeof themeStyles)["dark"];
}) {
  const { layout, content } = slide;

  switch (layout) {
    case "title":
      return (
        <View style={styles.titleSlide}>
          <Text style={[styles.title, { color: colors.text }]}>
            {content.title || ""}
          </Text>
          {content.subtitle && (
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {content.subtitle}
            </Text>
          )}
        </View>
      );

    case "section":
      return (
        <View style={styles.titleSlide}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {content.title || ""}
          </Text>
        </View>
      );

    case "title_content":
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.contentTitle, { color: colors.text }]}>
            {content.title || ""}
          </Text>
          <Text style={[styles.body, { color: colors.text }]}>
            {content.body || ""}
          </Text>
        </View>
      );

    case "bullets":
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.contentTitle, { color: colors.text }]}>
            {content.title || ""}
          </Text>
          {(content.bullets || []).map((bullet, i) => (
            <Text key={i} style={[styles.bullet, { color: colors.text }]}>
              <Text style={[styles.bulletDot, { color: colors.accent }]}>
                {"●  "}
              </Text>
              {bullet}
            </Text>
          ))}
        </View>
      );

    case "two_columns":
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.contentTitle, { color: colors.text }]}>
            {content.title || ""}
          </Text>
          <View style={styles.twoColumns}>
            <Text style={[styles.column, { color: colors.text }]}>
              {content.column_left || ""}
            </Text>
            <Text style={[styles.column, { color: colors.text }]}>
              {content.column_right || ""}
            </Text>
          </View>
        </View>
      );

    case "image_left":
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.contentTitle, { color: colors.text }]}>
            {content.title || ""}
          </Text>
          <View style={styles.imageRow}>
            <View style={styles.imageCol}>
              {content.image_url ? (
                <Image src={content.image_url} style={styles.image} />
              ) : (
                <View
                  style={[
                    styles.chartPlaceholder,
                    { borderColor: colors.muted },
                  ]}
                >
                  <Text style={[styles.chartText, { color: colors.muted }]}>
                    Image
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.body, { color: colors.text }]}>
                {content.body || ""}
              </Text>
            </View>
          </View>
        </View>
      );

    case "image_right":
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.contentTitle, { color: colors.text }]}>
            {content.title || ""}
          </Text>
          <View style={styles.imageRow}>
            <View style={styles.textCol}>
              <Text style={[styles.body, { color: colors.text }]}>
                {content.body || ""}
              </Text>
            </View>
            <View style={styles.imageCol}>
              {content.image_url ? (
                <Image src={content.image_url} style={styles.image} />
              ) : (
                <View
                  style={[
                    styles.chartPlaceholder,
                    { borderColor: colors.muted },
                  ]}
                >
                  <Text style={[styles.chartText, { color: colors.muted }]}>
                    Image
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );

    case "image_full":
      return (
        <View style={styles.titleSlide}>
          {content.image_url ? (
            <Image src={content.image_url} style={styles.image} />
          ) : (
            <View
              style={[
                styles.chartPlaceholder,
                { borderColor: colors.muted, width: "100%", height: 300 },
              ]}
            >
              <Text style={[styles.chartText, { color: colors.muted }]}>
                Image plein écran
              </Text>
            </View>
          )}
          {content.title && (
            <Text style={[styles.title, { color: colors.text, marginTop: 16 }]}>
              {content.title}
            </Text>
          )}
        </View>
      );

    case "quote":
      return (
        <View style={styles.titleSlide}>
          <Text style={[styles.quote, { color: colors.text }]}>
            {`« ${content.quote || ""} »`}
          </Text>
          {content.quote_author && (
            <Text style={[styles.quoteAuthor, { color: colors.accent }]}>
              — {content.quote_author}
            </Text>
          )}
        </View>
      );

    case "chart":
      return (
        <View style={{ flex: 1 }}>
          <Text style={[styles.contentTitle, { color: colors.text }]}>
            {content.title || ""}
          </Text>
          <View
            style={[styles.chartPlaceholder, { borderColor: colors.muted }]}
          >
            <Text style={[styles.chartText, { color: colors.muted }]}>
              Graphique : {content.chart_type || "bar"}
            </Text>
          </View>
        </View>
      );

    case "blank":
    default:
      return <View style={{ flex: 1 }} />;
  }
}

export function PresentationPDF({
  presentation,
  slides,
}: PresentationPDFProps) {
  const colors = themeStyles[presentation.theme] || themeStyles.dark;

  return (
    <Document>
      {slides.map((slide, index) => (
        <Page
          key={slide.id}
          size="A4"
          orientation="landscape"
          style={[styles.page, { backgroundColor: colors.bg }]}
        >
          <SlidePageContent slide={slide} colors={colors} />
          <Text style={[styles.slideNumber, { color: colors.muted }]}>
            {index + 1}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
