"use strict";

const PptxGenJS = require("pptxgenjs");

function hexToColor(hex) {
  return (hex || "7c3aed").replace("#", "");
}

async function generatePptx(templateDef, content, branding) {
  const styles = templateDef.defaultStyles || {};
  const accentColor = hexToColor(branding.accentColor || styles.accentColor || "#7c3aed");
  const textColor = hexToColor(branding.textColor || styles.textColor || "#1a1a1a");
  const mutedColor = hexToColor(branding.mutedColor || styles.mutedColor || "#6b7280");
  const companyName = branding.companyName || "TitleApp";

  const pptx = new PptxGenJS();
  pptx.author = companyName;
  pptx.company = companyName;
  pptx.title = content.title || "Presentation";
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

  // Define master slide with branding bar
  pptx.defineSlideMaster({
    title: "BRANDED",
    background: { color: "FFFFFF" },
    objects: [
      // Accent bar at top
      { rect: { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: accentColor } } },
      // Company name in footer
      { text: {
        text: companyName,
        options: { x: 0.5, y: 6.9, w: 4, h: 0.4, fontSize: 8, color: mutedColor, fontFace: "Helvetica" },
      }},
      // Slide number
      { text: {
        text: "Slide ",
        options: { x: 11, y: 6.9, w: 2, h: 0.4, fontSize: 8, color: mutedColor, align: "right", fontFace: "Helvetica" },
      }},
    ],
    slideNumber: { x: 12.2, y: 6.9, fontSize: 8, color: mutedColor },
  });

  const slides = content.slides || [];
  if (slides.length === 0) {
    // Single title slide fallback
    slides.push({ layout: "title", heading: content.title || "Presentation", subtitle: content.subtitle || "" });
  }

  for (const slideData of slides) {
    const layout = slideData.layout || "content";
    const slide = pptx.addSlide({ masterName: "BRANDED" });

    if (layout === "title") {
      // Title slide
      slide.addText(slideData.heading || "", {
        x: 1, y: 2, w: 11.33, h: 1.5,
        fontSize: 36, bold: true, color: textColor, fontFace: "Helvetica",
        align: "center",
      });
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 1, y: 3.5, w: 11.33, h: 1,
          fontSize: 20, color: mutedColor, fontFace: "Helvetica",
          align: "center",
        });
      }

    } else if (layout === "twoColumn") {
      // Two column
      if (slideData.heading) {
        slide.addText(slideData.heading, {
          x: 0.5, y: 0.3, w: 12.33, h: 0.8,
          fontSize: 24, bold: true, color: textColor, fontFace: "Helvetica",
        });
      }
      // Left column
      const leftContent = slideData.left || slideData.bullets || [];
      if (typeof leftContent === "string") {
        slide.addText(leftContent, { x: 0.5, y: 1.3, w: 5.8, h: 5, fontSize: 14, color: textColor, fontFace: "Helvetica", valign: "top" });
      } else if (Array.isArray(leftContent)) {
        const textItems = leftContent.map((b) => ({ text: typeof b === "string" ? b : b.text || "", options: { bullet: true, fontSize: 14, color: textColor, fontFace: "Helvetica" } }));
        slide.addText(textItems, { x: 0.5, y: 1.3, w: 5.8, h: 5, valign: "top" });
      }
      // Right column
      const rightContent = slideData.right || [];
      if (typeof rightContent === "string") {
        slide.addText(rightContent, { x: 6.8, y: 1.3, w: 5.8, h: 5, fontSize: 14, color: textColor, fontFace: "Helvetica", valign: "top" });
      } else if (Array.isArray(rightContent)) {
        const textItems = rightContent.map((b) => ({ text: typeof b === "string" ? b : b.text || "", options: { bullet: true, fontSize: 14, color: textColor, fontFace: "Helvetica" } }));
        slide.addText(textItems, { x: 6.8, y: 1.3, w: 5.8, h: 5, valign: "top" });
      }

    } else if (layout === "chart") {
      // Chart slide (table fallback since pptxgenjs charts need specific data shapes)
      if (slideData.heading) {
        slide.addText(slideData.heading, {
          x: 0.5, y: 0.3, w: 12.33, h: 0.8,
          fontSize: 24, bold: true, color: textColor, fontFace: "Helvetica",
        });
      }
      const chartData = slideData.chartData || slideData.data || [];
      if (Array.isArray(chartData) && chartData.length > 0) {
        const headers = Object.keys(chartData[0]);
        const tableRows = [headers.map((h) => ({ text: h, options: { bold: true, fontSize: 10, color: "FFFFFF", fill: { color: accentColor } } }))];
        for (const row of chartData) {
          tableRows.push(headers.map((h) => ({ text: String(row[h] || ""), options: { fontSize: 10, color: textColor } })));
        }
        slide.addTable(tableRows, {
          x: 0.5, y: 1.3, w: 12.33,
          border: { type: "solid", pt: 0.5, color: "CCCCCC" },
          colW: headers.map(() => 12.33 / headers.length),
        });
      }

    } else {
      // Content slide (heading + bullets)
      if (slideData.heading) {
        slide.addText(slideData.heading, {
          x: 0.5, y: 0.3, w: 12.33, h: 0.8,
          fontSize: 24, bold: true, color: textColor, fontFace: "Helvetica",
        });
      }
      const bullets = slideData.bullets || slideData.content || [];
      if (typeof bullets === "string") {
        slide.addText(bullets, { x: 0.5, y: 1.3, w: 12.33, h: 5.5, fontSize: 16, color: textColor, fontFace: "Helvetica", valign: "top" });
      } else if (Array.isArray(bullets)) {
        const textItems = bullets.map((b) => ({
          text: typeof b === "string" ? b : b.text || "",
          options: { bullet: true, fontSize: 16, color: textColor, fontFace: "Helvetica", breakLine: true },
        }));
        slide.addText(textItems, { x: 0.5, y: 1.3, w: 12.33, h: 5.5, valign: "top" });
      }
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    }
  }

  // Disclosure slide
  const discSlide = pptx.addSlide({ masterName: "BRANDED" });
  discSlide.addText("Disclosure", {
    x: 0.5, y: 2.5, w: 12.33, h: 0.8,
    fontSize: 24, bold: true, color: textColor, fontFace: "Helvetica", align: "center",
  });
  discSlide.addText(branding.footerText || "Generated by TitleApp Digital Worker. AI-assisted analysis — human review recommended.", {
    x: 1, y: 3.5, w: 11.33, h: 2,
    fontSize: 12, color: mutedColor, fontFace: "Helvetica", align: "center",
  });

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return { buffer: Buffer.from(buffer) };
}

module.exports = { generatePptx };
