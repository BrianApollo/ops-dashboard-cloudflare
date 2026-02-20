import { onRequestPost as __api_auth_login_ts_onRequestPost } from "C:\\Users\\User\\Downloads\\ops-dashboard-main\\functions\\api\\auth\\login.ts"
import { onRequestPost as __api_auth_logout_ts_onRequestPost } from "C:\\Users\\User\\Downloads\\ops-dashboard-main\\functions\\api\\auth\\logout.ts"
import { onRequestGet as __api_auth_me_ts_onRequestGet } from "C:\\Users\\User\\Downloads\\ops-dashboard-main\\functions\\api\\auth\\me.ts"
import { onRequestPost as __api_facebook_proxy_ts_onRequestPost } from "C:\\Users\\User\\Downloads\\ops-dashboard-main\\functions\\api\\facebook\\proxy.ts"
import { onRequest as __api_airtable___path___ts_onRequest } from "C:\\Users\\User\\Downloads\\ops-dashboard-main\\functions\\api\\airtable\\[[path]].ts"
import { onRequest as __api_redtrack___path___ts_onRequest } from "C:\\Users\\User\\Downloads\\ops-dashboard-main\\functions\\api\\redtrack\\[[path]].ts"

export const routes = [
    {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/me",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_me_ts_onRequestGet],
    },
  {
      routePath: "/api/facebook/proxy",
      mountPath: "/api/facebook",
      method: "POST",
      middlewares: [],
      modules: [__api_facebook_proxy_ts_onRequestPost],
    },
  {
      routePath: "/api/airtable/:path*",
      mountPath: "/api/airtable",
      method: "",
      middlewares: [],
      modules: [__api_airtable___path___ts_onRequest],
    },
  {
      routePath: "/api/redtrack/:path*",
      mountPath: "/api/redtrack",
      method: "",
      middlewares: [],
      modules: [__api_redtrack___path___ts_onRequest],
    },
  ]