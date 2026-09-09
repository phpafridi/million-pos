declare module "html2pdf.js" {
  export interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: { scale?: number };
    jsPDF?: { unit?: string; format?: string | string[]; orientation?: "portrait" | "landscape" };
  }

  export interface Html2Pdf {
    set: (opt: Html2PdfOptions) => Html2Pdf;
    from: (element: HTMLElement | string) => Html2Pdf;
    save: () => void;
  }

  function html2pdf(): Html2Pdf;
  export default html2pdf;
}
