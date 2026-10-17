import { renderToStaticMarkup } from "react-dom/server";
import { downloadCsvSheet, downloadXlsx, printHtml, reportData, reportFileName, reportHtml, type ReportKind } from "../engine/reports";
import { useApp } from "../store";
import LiveChart from "./LiveChart";

export function useReportActions() {
  const app = useApp();
  const ctx = { ds: app.ds, today: app.today, threshold: app.threshold, horizon: app.horizon, company: app.settings.company };
  const data = (kind: ReportKind, params?: any) => reportData(kind, ctx, params);
  return {
    xlsx: async (kind: ReportKind, title: string, params?: any) => {
      const d = data(kind, params);
      await downloadXlsx(reportFileName(title, "xlsx"), d.sheets);
      app.addSend({ t: Date.now(), report: title, to: "ดาวน์โหลด", channel: "Excel", status: "สำเร็จ" });
      app.toast(`ดาวน์โหลด ${title}.xlsx แล้ว`);
    },
    csv: (kind: ReportKind, title: string, params?: any) => {
      const d = data(kind, params);
      const sh = d.sheets.find((s) => s.name === "รายวัน") ?? d.sheets[d.sheets.length - 1];
      downloadCsvSheet(reportFileName(`${title} ${sh.name}`, "csv"), sh);
      app.addSend({ t: Date.now(), report: title, to: "ดาวน์โหลด", channel: "CSV", status: "สำเร็จ" });
      app.toast("ดาวน์โหลด CSV แล้ว");
    },
    pdf: (kind: ReportKind, title: string, params?: any) => {
      const d = data(kind, params);
      const svg = d.f && kind !== "claims" && kind !== "underwriting"
        ? renderToStaticMarkup(<LiveChart w={760} h={330} x0={60} x1={720} yZero={290} yTop={50} yTickX={38} xTickY={316} threshold={app.threshold} compact
            callout={d.s ? "scenario" : "breach"} series={[{ pts: d.f.series, color: "#8b1a24", band: "#f9e4e6" }, ...(d.s ? [{ pts: d.s.series, color: "#f39a1e", band: "#fdebd2", bandOpacity: 0.7 }] : [])]} />)
        : "";
      printHtml(title, reportHtml(title, ctx, d, svg));
      app.addSend({ t: Date.now(), report: title, to: "ดาวน์โหลด", channel: "PDF", status: "สำเร็จ" });
    },
  };
}
