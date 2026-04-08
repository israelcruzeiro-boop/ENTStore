const pdfjsLib = await import("https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs?bundle");
console.log("Keys:", Object.keys(pdfjsLib));
console.log("GlobalWorkerOptions:", typeof pdfjsLib.GlobalWorkerOptions);
if (pdfjsLib.default) {
  console.log("default.GlobalWorkerOptions:", typeof pdfjsLib.default.GlobalWorkerOptions);
}
