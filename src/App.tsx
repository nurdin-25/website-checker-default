import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  type WebsiteListInterface,
  type WebsiteListWithStatusInterface,
} from "./data/website";
import { classifyClient, isServerOnlineFromAxiosResponse } from "./helper";
import ClientBadge from "./component/ClientBadge";
import ServerBadge from "./component/ServerBadge";
import { BarLoader, BeatLoader } from "react-spinners";

const backend = import.meta.env.VITE_BACKEND_URL;

interface ResponseFetch {
  data: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    items: WebsiteListInterface[];
  };
}

function App() {
  const [table, setTable] = useState<WebsiteListWithStatusInterface[]>([]);
  const [data, setData] = useState<WebsiteListInterface[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [limit] = useState(10);
  const [totalItem, setTotalItem] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const [selectedServer, setSelectedServer] = useState<string>("ALL");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: response } = await axios.get<ResponseFetch>(
        `${backend}/get-data-client?page=${page}&limit=${limit}&selectedServer=${selectedServer}`,
        { validateStatus: () => true }
      );
      setData(response.data.items || []);
      setTotalItem(response.data.total || 0);
      setTotalPage(response.data.totalPages || 0);
    } catch {
      setData([]);
      setTotalItem(0);
      setTotalPage(0);
    }
  }, [page, limit, selectedServer]);

  const getStatus = useCallback(async () => {
    const rows: WebsiteListWithStatusInterface[] = [];

    for (const website of data) {
      let client: { bool: boolean; mode: "online" | "protected" | "offline" } = { bool: false, mode: "offline" };
      if (website.domain_name) {
        try {
          const res = await axios.get(`${backend}/check`, {
            params: { url: website.domain_name },
            timeout: 12000,
            validateStatus: () => true,
          });
          client = classifyClient({ status: res.status, data: res.data });
        } catch (err) {
          client = classifyClient(undefined, err);
        }
      }

      let serverOnline = false;
      if (website.backend_url) {
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

      rows.push({
        server_location: website.server_location,
        domain_name: website.domain_name,
        program_name: website.program_name,
        status_client: client.bool,
        backend_url: website.backend_url,
        status_server: serverOnline,
      });
    }

    setTable(rows);
    setLoading(false);
  }, [data]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (data.length) getStatus();
    else setTable([]);
  }, [data, getStatus]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPage) return;
    setPage(newPage);
  };

  const handleSelection = (server: string) => {
    setSelectedServer(server);
    setPage(1);
  };

  return (
    <>
      <h1 className="text-center m-3 text-5xl font-bold">Domain Checker</h1>
      <div className="w-auto m-5 p-3 rounded bg-amber-200 flex-col">
        <h4 className="font-bold mb-3">Filter :</h4>
        <div className="w-auto flex flex-wrap gap-4">
          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Select Server</label>
            <select value={selectedServer} disabled={loading} onChange={(e) => handleSelection(e.target.value)} className="bg-white rounded p-3 w-56">
              <option value="ALL">All</option>
              <option value="biznet-1">Biznet 1</option>
              <option value="biznet-2">Biznet 2</option>
            </select>
          </div>
          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Search</label>
            <input placeholder="Search" className="bg-white p-3 rounded w-80" />
          </div>
          <div className="flex items-end gap-2">
            <button
              disabled={loading}
              className="m-0 p-3 bg-white rounded border"
              onClick={fetchData}
            >
              {loading ? "Checking..." : "Cari"}
            </button>
          </div>
        </div>
      </div>
        {
          loading
            ? <BarLoader className="ml-5" />
            : <>
              <div className="mb-2 ml-5 font-bold">Total Toko: {totalItem}</div>
            </>
        }
        <div
          ref={tableRef}
          className="overflow-x-auto m-5"
          style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
          <table className="min-w-full border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Server Location</th>
                <th className="border px-4 py-2 text-left">Program Name</th>
                <th className="border px-4 py-2 text-left">Domain Name</th>
                <th className="border px-4 py-2 text-left">Client Status</th>
                <th className="border px-4 py-2 text-left">Backend URL</th>
                <th className="border px-4 py-2 text-left">Server Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6">
                    <div className="p-5">
                      <BeatLoader />
                    </div>
                  </td>
                </tr>
              ) : (
                table.map((site, index) => (
                <tr key={`${site.program_name}-${index}`} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{site.server_location}</td>
                  <td className="border px-4 py-2">{site.program_name}</td>
                  <td className="border px-4 py-2">{site.domain_name}</td>
                  <td className="border px-4 py-2">
                  <ClientBadge mode={site.status_client ? "online" : "offline"} />
                  </td>
                  <td className="border px-4 py-2">
                  {site.backend_url?.split("/api")[0] || "-"}
                  </td>
                  <td className="border px-4 py-2">
                  <ServerBadge status={site.status_server} />
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex justify-center items-center gap-2 mt-5">
            <button
              onClick={() => handlePageChange(page - 1)}
              className="px-3 py-1 bg-gray-200 rounded"
              disabled={page <= 1}
            >
              Prev
            </button>
            {
              loading ?? (<>
                <span>Page {page}</span>
                <span>/ {totalPage}</span>
              </>)
            }
            <button
              onClick={() => handlePageChange(page + 1)}
              className="px-3 py-1 bg-gray-200 rounded"
              disabled={page >= totalPage}
            >
              Next
            </button>
          </div>
          {table.length === 0 && !loading && (
            <div className="text-center text-gray-500 p-6">Tidak ada data.</div>
          )}
        </div>
    </>
  );
}

export default App;
