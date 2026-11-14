import { computeLine, findHints, totals } from "../lib/recon";
import { parseNumber } from "../lib/format";

const ok = (c: boolean, m: string) => { if (!c) { console.error("GAGAL:", m); process.exit(1); } else console.log("ok  ", m); };

const l = computeLine({ gl_account: "1", gl_name: "A", tb_balance: 1000, system_balance: 900, system_count: 3 }, []);
ok(l.diff === 100 && l.status === "diff" && l.unexplained === 100, "selisih TB - sistem");
const l2 = computeLine({ gl_account: "1", gl_name: "A", tb_balance: 1000, system_balance: 900, system_count: 3 }, [{ gl_account: "1", description: "x", amount: 100 }]);
ok(l2.status === "explained" && l2.unexplained === 0, "selisih terjelaskan oleh penyesuaian");
ok(computeLine({ gl_account: "1", gl_name: "A", tb_balance: 0.4, system_balance: 0, system_count: 0 }, []).status === "match", "toleransi sen");
ok(computeLine({ gl_account: "1", gl_name: "A", tb_balance: null, system_balance: 5, system_count: 1 }, []).status === "empty", "belum diisi");
const t = totals([l, computeLine({ gl_account: "2", gl_name: "B", tb_balance: null, system_balance: 50, system_count: 1 }, [])]);
ok(t.diff === 100 && t.sys === 950 && t.filled === 1, "total hanya menghitung akun terisi");

const assets = [
  { id: 1, gl_account: "2", project: "P1", vendor: "v", item_name: "a", product_code: "a", amount: 300 },
  { id: 2, gl_account: "2", project: "P2", vendor: "v", item_name: "b", product_code: "b", amount: 200 },
  { id: 3, gl_account: "1", project: "P3", vendor: "v", item_name: "c", product_code: "c", amount: 50 },
];
const h = findHints("1", 500, assets);
ok(h.some((x) => x.text.includes("P1") && x.text.includes("P2")), "petunjuk: gabungan dua project = selisih");
ok(findHints("1", -50, assets).some((x) => x.text.includes("P3")), "petunjuk: selisih negatif -> project di akun ini");

ok(parseNumber("1.234.567,89") === 1234567.89, "parse format Indonesia");
ok(parseNumber("1,234,567.89") === 1234567.89, "parse format US");
ok(parseNumber("7.364.105.000") === 7364105000, "parse ribuan titik");
ok(parseNumber("-302000000") === -302000000, "parse negatif");
ok(parseNumber("(1.000)") === -1000, "parse kurung negatif");
ok(parseNumber("abc") === null, "parse tidak valid");

// kombinasi 3 project
const many = Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, gl_account: "2", project: "Q" + i, vendor: "v", item_name: "i", product_code: "i", amount: 1000 * 2 ** i }));
const h3 = findHints("1", 1000 + 4000 + 16000, many);
ok(h3.some((x) => x.text.includes("Q0") && x.text.includes("Q2") && x.text.includes("Q4")), "petunjuk: kombinasi 3 project");
