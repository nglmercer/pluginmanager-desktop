import { Electroview } from "electrobun/view";

// Define RPC schema for plugin manager
const rpc = Electroview.defineRPC({
  handlers: {
    requests: {
      /* browser-side request handlers */
    },
    messages: {
      /* browser-side message handlers */
    },
  },
});

export const electroview = new Electroview({ rpc });
