import axios from "axios";

import { CAL_API_VERSION_HEADER, X_CAL_CLIENT_ID, X_CAL_PLATFORM_EMBED } from "@scheduling/platform-constants";

// Immediately Invoked Function Expression to create simple singleton class like

const http = (function () {
  const instance = axios.create({
    timeout: 10000,
    headers: {},
  });
  // Shared native UI still uses this interface; its retired server transport stays closed.
  instance.interceptors.request.use(() => {
    throw new Error("This feature is not available yet. Use the application booking pages.");
  });
  let refreshUrl = "";
  return {
    instance: instance,
    get: instance.get,
    post: instance.post,
    put: instance.put,
    patch: instance.patch,
    delete: instance.delete,
    responseInterceptor: instance.interceptors.response,
    setRefreshUrl: (url: string) => {
      refreshUrl = url;
    },
    getRefreshUrl: () => {
      return refreshUrl;
    },
    setUrl: (url: string) => {
      instance.defaults.baseURL = url;
    },
    getUrl: () => {
      return instance.defaults.baseURL;
    },
    setAuthorizationHeader: (accessToken: string) => {
      instance.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    },
    getAuthorizationHeader: () => {
      return instance.defaults.headers.common?.["Authorization"]?.toString() ?? "";
    },
    setClientIdHeader: (clientId: string) => {
      instance.defaults.headers.common[X_CAL_CLIENT_ID] = clientId;
    },
    getClientIdHeader: () => {
      return instance.defaults.headers.common?.[X_CAL_CLIENT_ID]?.toString() ?? "";
    },
    setPlatformEmbedHeader: (isEmbed: boolean) => {
      instance.defaults.headers.common[X_CAL_PLATFORM_EMBED] = isEmbed.toString();
    },
    getPlatformEmbedHeader: () => {
      return instance.defaults.headers.common?.[X_CAL_PLATFORM_EMBED]?.toString() ?? "";
    },
    setVersionHeader: (clientId: string) => {
      instance.defaults.headers.common[CAL_API_VERSION_HEADER] = clientId;
    },
    getVersionHeader: () => {
      return instance.defaults.headers.common?.[X_CAL_CLIENT_ID]?.toString() ?? "";
    },
    refreshTokens: async (_refreshUrl: string): Promise<string> => {
      throw new Error("This feature is not available yet. Use the application booking pages.");
    },
  };
})();

export default http;
