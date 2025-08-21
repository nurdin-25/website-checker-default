export interface WebsiteListInterface {
    server_location: string,
    program_name: string,
    domain_name: string,
    backend_url: string,
}

export interface StatusInterface {
    status_client: boolean,
    status_server: boolean,
}

export type WebsiteListWithStatusInterface = WebsiteListInterface & StatusInterface;

const WebsiteList: Array<WebsiteListInterface> = [
    {
        server_location: "nevacloud-dev",
        program_name: "QC Cabang",
        domain_name: "qc-cabang.goldstore.id",
        backend_url: 'https://157.15.124.133:7111/api/v1/system/get',
    },
    {
        server_location: "nevacloud-dev",
        program_name: "QC Pusat",
        domain_name: "qc-cabang.goldstore.id",
        backend_url: 'https://157.15.124.133:7111/api/v1/system/get',
    },
    {
        server_location: "biznet-1",
        program_name: "Hidup Slawi",
        domain_name: "hdpslw.com",
        backend_url: 'https://103.196.146.28:10113/api/v1/system/get',
    }
];

export default WebsiteList;