/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

// в SW может быть сразу две переменных TRUE
export const IS_SERVICE_WORKER = typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
export const IS_WEB_WORKER = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope && !IS_SERVICE_WORKER;
export const IS_WORKER = IS_WEB_WORKER || IS_SERVICE_WORKER;
