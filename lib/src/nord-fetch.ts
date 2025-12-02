import type { RequestInit as NodeFetchInit } from "node-fetch"

type FetchType = ( input: RequestInfo | URL, init?: RequestInit ) => Promise<Response>

let nordFetchInstance: FetchType | null = null

export const setupNordFetch = async ( {
  server,
  username,
  password,
  port = 1080,
}: {
  server: string;
  username: string;
  password: string;
  port?: number;
} ) => {
  const fetch = ( await import( "node-fetch" ) ).default
  const { SocksProxyAgent } = await import( "socks-proxy-agent" )

  const socksUrl = `socks5://${username}:${password}@${server}:${port}`
  const agent = new SocksProxyAgent( socksUrl )

  // Convert DOM RequestInit → node-fetch RequestInit
  const toNodeFetchInit = ( init: RequestInit | undefined ): NodeFetchInit => {
    if ( !init ) return { agent }

    const nodeInit: NodeFetchInit = {
      agent,
      method: init.method,
      headers: init.headers,
      redirect: init.redirect as NodeFetchInit["redirect"],
      // body must match node-fetch BodyInit | null
      body: init.body as NodeFetchInit["body"],
    }

    return nodeInit
  }

  nordFetchInstance = async ( input, init = {} ) => {
    const url = input instanceof URL ? input.toString() : String( input )

    const nodeInit = toNodeFetchInit( init )

    // node-fetch Response is DOM-compatible; single cast required
    const res = await fetch( url, nodeInit )
    return res as unknown as Response
  }
}

export const nordFetch: FetchType = ( ...args ) => {
  if ( !nordFetchInstance ) {
    throw new Error( "Call setupNordFetch() before nordFetch()" )
  }
  return nordFetchInstance( ...args )
}
