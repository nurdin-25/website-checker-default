/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import {
  type WebsiteListInterface,
  type WebsiteListWithStatusInterface,
} from "./data/website";

const backend = import.meta.env.VITE_BACKEND_URL;

// === Badge 3 warna (client) ===
const ClientBadge: React.FC<{ mode: "online" | "protected" | "offline" }> = ({ mode }) => {
  const m =
    mode === "online"
      ? { cls: "bg-green-100 text-green-700", label: "Online" }
      : mode === "protected"
      ? { cls: "bg-amber-100 text-amber-700", label: "Online – Protected" }
      : { cls: "bg-red-100 text-red-700", label: "Offline" };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>;
};

// === Badge 2 warna (server/origin) ===
const ServerBadge: React.FC<{ status: boolean }> = ({ status }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-medium ${
      status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}
  >
    {status ? "Online" : "Offline"}
  </span>
);

// ---- Helpers ----

// Klasifikasi status client dari response /check
function classifyClient(res?: { status: number; data?: any }, err?: any):
  { bool: boolean; mode: "online" | "protected" | "offline" } {

  // Cek response/data lebih detail
  const extract = (x: any) => {
    if (!x) return undefined;
    if (typeof x === "object" && x.status) {
      if (typeof x.status === "boolean") return x.status ? "ONLINE" : "OFFLINE";
      if (typeof x.status === "string") return x.status.toUpperCase();
    }
    if (typeof x === "string") return x.toUpperCase();
    return undefined;
  };

  const val =
    extract(res?.data) ??
    extract(res) ??
    extract(err?.response?.data) ??
    extract(err?.response);

  if (val === "ONLINE") return { bool: true, mode: "online" };
  if (val === "ONLINE_PROTECTED" || val === "PROTECTED") return { bool: true, mode: "protected" };
  if (val === "OFFLINE") return { bool: false, mode: "offline" };

  // fallback berdasarkan HTTP code dari /check
  const code = res?.status ?? err?.response?.status ?? 0;
  if (code === 403 || code === 503) return { bool: true, mode: "protected" };
  if (code >= 100 && code <= 599) return { bool: true, mode: "online" };
  return { bool: false, mode: "offline" };
}

// Klasifikasi server/origin (anggap online jika ada respon HTTP apapun)
function isServerOnlineFromAxiosResponse(r?: { status?: number }) {
  return typeof r?.status === "number" && r.status >= 200 && r.status < 500;
}

function App() {
  const [table, setTable] = useState<Array<WebsiteListWithStatusInterface>>([]);
  const [clientModeMap, setClientModeMap] = useState<Record<string, "online" | "protected" | "offline">>({});
  const [serverName, setServerName] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [data, setData] = useState<Array<WebsiteListInterface>>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const tableRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${backend}/get-data-client`, { validateStatus: () => true });
      setData(response.data.data || []);
    } catch {
      setData([]);
    }
  };

  const filteredList = useMemo(() => {
    const byServer = serverName === "ALL" ? data : data.filter((w) => w.server_location === serverName);
    if (!search.trim()) return byServer;
    const q = search.toLowerCase();
    return byServer.filter(
      (site) =>
        site.program_name.toLowerCase().includes(q) ||
        site.domain_name.toLowerCase().includes(q) ||
        site.server_location.toLowerCase().includes(q)
    );
  }, [data, serverName, search]);

  const getStatus = async () => {
    setLoading(true);
    setTable([]);
    setClientModeMap({});

    for (const website of filteredList) {
      // --- Client status via /check ---
      let client: { bool: boolean; mode: "online" | "protected" | "offline" } = { bool: false, mode: "offline" };
      if (website.domain_name?.length) {
        try {
          const res = await axios.get(`${backend}/check`, {
            params: { url: website.domain_name },
            timeout: 12000,
            validateStatus: () => true,
          });
          client = classifyClient({ status: res.status, data: res.data });
        } catch (err: any) {
          client = classifyClient(undefined, err);
        }
      }

      // --- Server/origin status ---
      let serverOnline = false;
      if (website.backend_url?.length) {
        try {
          const head = await axios.head(website.backend_url, {
            timeout: 8000,
            validateStatus: () => true,
          });
          serverOnline = isServerOnlineFromAxiosResponse(head);

          if (!serverOnline) {
            const get = await axios.get(website.backend_url, {
              timeout: 10000,
              validateStatus: () => true,
            });
            serverOnline = isServerOnlineFromAxiosResponse(get);
          }
        } catch {
          serverOnline = false;
        }
      }
      if (!website.backend_url) serverOnline = false;

      const row: WebsiteListWithStatusInterface = {
        server_location: website.server_location,
        domain_name: website.domain_name,
        program_name: website.program_name,
        status_client: client.bool,
        backend_url: website.backend_url,
        status_server: serverOnline,
      };

      setTable((prev) => [...prev, row]);
      setClientModeMap((prev) => ({ ...prev, [website.domain_name]: client.mode }));
    }

    // Tambahkan data yang tidak lolos filter sebagai offline
    data.forEach((site) => {
      if (!filteredList.find((f) => f.domain_name === site.domain_name)) {
        setTable((prev) => [...prev, {
          server_location: site.server_location,
          domain_name: site.domain_name,
          program_name: site.program_name,
          status_client: false,
          backend_url: site.backend_url,
          status_server: false,
        }]);
        setClientModeMap((prev) => ({ ...prev, [site.domain_name]: "offline" }));
      }
    });

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (data.length > 0) getStatus(); }, [data]);
  useEffect(() => { if (data.length > 0) getStatus(); }, [serverName]);
  useEffect(() => {
    const ref = tableRef.current;
    if (!ref) return;
    const handleScroll = () => {
      // Jika posisi scroll sudah di bawah, aktifkan autoScroll
      const isBottom = ref.scrollHeight - ref.scrollTop - ref.clientHeight < 10;
      setAutoScroll(isBottom);
    };
    ref.addEventListener("scroll", handleScroll);
    return () => ref.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (autoScroll && tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [table, autoScroll]);
  // Reset page saat filter berubah
  useEffect(() => { setPage(1); }, [search, serverName]);

  return (
    <>
      <h1 className="text-center m-3 text-5xl font-bold">Domain Checker</h1>

      <div className="w-auto m-5 p-3 rounded bg-amber-200 flex-col">
        <h4 className="font-bold mb-3">Filter :</h4>
        <div className="w-auto flex flex-wrap gap-4">
          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Select Server</label>
            <select
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="bg-white rounded p-3 w-56"
            >
              <option value="ALL">All</option>
              <option value="biznet-1">Biznet 1</option>
              <option value="biznet-2">Biznet 2</option>
              <option value="backup-server">Backup Server</option>
              <option value="nevacloud-dev">Nevacloud Dev</option>
              <option value="nevacloud-2">Nevacloud 2</option>
              <option value="nevacloud-3">Nevacloud 3</option>
            </select>
          </div>

          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Search</label>
            <input
              placeholder="Search"
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white p-3 rounded w-80"
            />
          </div>

          <div className="flex items-end">
            <button onClick={getStatus} className="m-0 p-3 bg-white rounded border">
              {loading ? "Checking..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-2 ml-5 font-bold">Total Toko: {table.length}</div>
      <div ref={tableRef} className="overflow-x-auto m-5" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">No</th>
              <th className="border px-4 py-2 text-left">Server Location</th>
              <th className="border px-4 py-2 text-left">Program Name</th>
              <th className="border px-4 py-2 text-left">Domain Name</th>
              <th className="border px-4 py-2 text-left">Client Status</th>
              <th className="border px-4 py-2 text-left">Backend URL</th>
              <th className="border px-4 py-2 text-left">Server Status</th>
            </tr>
          </thead>
          <tbody>
            {table
              .filter((site) => {
                const q = search.toLowerCase();
                return (
                  !q ||
                  site.program_name.toLowerCase().includes(q) ||
                  site.domain_name.toLowerCase().includes(q) ||
                  site.server_location.toLowerCase().includes(q)
                );
              })
              .slice((page - 1) * pageSize, page * pageSize)
              .map((site, index) => {
                const mode = clientModeMap[site.domain_name] ?? (site.status_client ? "online" : "offline");
                const no = (page - 1) * pageSize + index + 1;
                return (
                  <tr key={`${site.program_name}-${index}`} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{no}</td>
                    <td className="border px-4 py-2">{site.server_location}</td>
                    <td className="border px-4 py-2">{site.program_name}</td>
                    <td className="border px-4 py-2">{site.domain_name}</td>
                    <td className="border px-4 py-2"><ClientBadge mode={mode} /></td>
                    <td className="border px-4 py-2">{site.backend_url?.split("/api")[0] || "-"}</td>
                    <td className="border px-4 py-2"><ServerBadge status={site.status_server} /></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {/* Pagination controls */}
        <div className="flex justify-center items-center gap-2 my-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-200 rounded">Prev</button>
          <span>Page {page}</span>
          <button onClick={() => setPage((p) => p * pageSize < table.length ? p + 1 : p)} disabled={page * pageSize >= table.length} className="px-3 py-1 bg-gray-200 rounded">Next</button>
        </div>

        {table.length === 0 && !loading && (
          <div className="text-center text-gray-500 p-6">Tidak ada data.</div>
        )}
      </div>
    </>
  );
}

export default App;
