import { parse, print, Kind, DocumentNode } from "graphql";
import { addTypenameToSelectionSets, extractTypenames } from './utils';
type WorkerEnv = { RESPONSES: KVNamespace; TYPENAMES: KVNamespace };

const DESTINATION = "https://fakeql.com/graphql/27ce0c5f1a30bb3b9fb34348aef5ef80";

const fetchFn: ExportedHandlerFetchHandler<WorkerEnv> = async (
  request,
  env,
  ctx
) => {
  console.log(request);

  const body = await request
  .clone()
  .text()
  .then(JSON.parse);

  const document = parse(body.query);

  const isQuery = document.definitions.some(node => node.kind === Kind.OPERATION_DEFINITION && node.operation === "query");
  
  
  return isQuery 
  ? handleQuery(document)(request, env, ctx) 
  : handleMutation(document, body)(request, env, ctx);
  // return fetch(new Request(DESTINATION, request));
  // return new Response();
};


const handleMutation = (query: DocumentNode, body: any): ExportedHandlerFetchHandler<WorkerEnv> => (request, env, ctx) => {
  return fetch(new Request(DESTINATION, {
    ...request,
    body: JSON.stringify({
      ...body,
      query: print(addTypenameToSelectionSets(query)),
    }),
  }));
};

const handleQuery = (query: DocumentNode): ExportedHandlerFetchHandler<WorkerEnv> => async (request, env, ctx) => {
  
  await env.RESPONSES.put("Key1", "Hello");

  const queryString = print(query);
  const cachedResponse = await env.RESPONSES.get(queryString);

  if (cachedResponse) {
    console.log("CACHHEEE")
    return new Response(cachedResponse, {
      headers: {
        "Content-Type": "application/json",
        "x-cache-hit": "true",
      },
    });
  }
  
  const newResponse = await fetch(new Request(DESTINATION, request));

  const newJson = await newResponse.clone().json<any>();

if (newResponse.ok && !("error" in newJson)) {
    console.log("CACHING QUERY");
    ctx.waitUntil(Promise.all([
      env.RESPONSES.put(queryString, JSON.stringify(newJson)),
      ...extractTypenames(newJson).map(async (t) => {
        const prev = JSON.parse(await env.TYPENAMES.get(t) || "[]");
        await env.TYPENAMES.put(t, JSON.stringify([...prev, queryString]))
      })
    ]));
  }

  // if (newResponse.ok && !("error" in newJson)) {
  //   ctx.waitUntil(Promise.all([]));

  //   console.log("CACHING QUERY");
  //   await env.RESPONSES.put(queryString, JSON.stringify(newJson));

  // }
  return newResponse;
}


export default {
  fetch: fetchFn,
};
