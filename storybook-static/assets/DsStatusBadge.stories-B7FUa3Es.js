import{n as e}from"./rolldown-runtime-DkW27tQK.js";import{a as t,d as n,f as r,l as i,o as a,s as o}from"./iframe-CM26g2Y8.js";var s;function c(){return(c=e((()=>{t(),s=o({__name:`DsStatusBadge`,props:{status:{}},setup(e){let t={available:`Verfügbar`,charging:`Lädt`,faulted:`Störung`,offline:`Offline`};return(o,s)=>(i(),a(`span`,{class:n([`ds-badge`,`ds-badge--${e.status}`])},r(t[e.status]),3))}})})))()}var l;function u(){return(u=e((()=>{l=(e,t)=>{let n=e.__vccOpts||e;for(let[e,r]of t)n[e]=r;return n}})))()}var d;function f(){return(f=e((()=>{c(),u(),d=l(s,[[`__scopeId`,`data-v-47ef65b8`]]),s.__docgenInfo=Object.assign({displayName:s.name??s.__name},{exportName:`default`,displayName:`DsStatusBadge`,description:``,tags:{},props:[{name:`status`,required:!0,type:{name:`StationStatus`}}],sourceFiles:[`C:/Users/Gerrit/job-search/charge-portal-nuxt/app/components/ds/DsStatusBadge.vue`]})})))()}var p,m,h,g,_,v;function y(){return(y=e((()=>{f(),p={title:`Design System/StatusBadge`,component:d,tags:[`autodocs`],args:{status:`available`}},m={},h={args:{status:`charging`}},g={args:{status:`faulted`}},_={args:{status:`offline`}},v=[`Available`,`Charging`,`Faulted`,`Offline`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'charging'
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'faulted'
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'offline'
  }
}`,..._.parameters?.docs?.source}}}})))()}y();export{m as Available,h as Charging,g as Faulted,_ as Offline,v as __namedExportsOrder,p as default};