import { EventEmitter } from "node:events";

// 每完成一筆分析就發出通知，讓本機同步程式即時抓取
export const analysisEvents = new EventEmitter();
analysisEvents.setMaxListeners(50);
