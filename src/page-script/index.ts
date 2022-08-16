const postHttpResponseData = (xhr: XMLHttpRequest, xhrRequest, sendParams) => {
  if (!xhr.responseURL) return;

  let requestContentType: TRequestContentType =
    'application/x-www-form-urlencoded';
  const url = new URL(xhr.responseURL);
  if (
    xhrRequest?.customRequestHeaders?.['Content-Type']?.includes(
      'application/json',
    )
  ) {
    requestContentType = 'application/json';
  }
  const xhrInfo = {
    isMtop: false,
    pageURL: window.location.host + window.location.pathname,
    method: xhrRequest.method,
    query: xhrRequest.query,
    requestParams: sendParams,
    host: url.host,
    url: url.host + url.pathname,
    responseText: xhr.responseText,
    requestContentType,
  };
  postPageMessage({
    type: 'responseData',
    data: xhrInfo,
  });
};

const postMtopResponseData = (mtopInfo) => {
  const data = {
    isMtop: true,
    pageURL: window.location.host + window.location.pathname,
    method: mtopInfo.method,
    requestParams: mtopInfo.data,
    version: mtopInfo.version,
    url: mtopInfo.url,
    response: mtopInfo.response,
  };

  postPageMessage({
    type: 'responseData',
    data,
  });
};
const postRequestData = (info) => {
  const data = {
    isMtop: info.isMtop,
    pageURL: window.location.host + window.location.pathname,
    method: info.method,
    requestParams: info.requestParams,
    query: info.query,
    version: info.version,
    url: info.url,
  };

  postPageMessage({
    type: 'requestData',
    data,
  });
};

const createMessageBridge = () => {
  let pageMockConfig: IPageConfig; // let pageMockConfig: PageConfig;
  try {
    pageMockConfig = JSON.parse(
      document.documentElement.dataset?.toolconfig || '{}',
    );
  } catch (e) {
    console.warn('解析document toolconfig出错', e);
  }

  const bridgeDiv = document.createElement('div');
  bridgeDiv.style.display = 'none';
  bridgeDiv.id = 'extension';
  document.body.append(bridgeDiv);

  const config = { childList: true };
  // const observer = new MutationObserver()
  const observer = new MutationObserver(() => {
    console.log('MutationObserver pagescript', bridgeDiv.innerText);
    try {
      pageMockConfig = JSON.parse(bridgeDiv.innerText);
    } catch (e) {
      console.warn('解析页面mock配置出错a', e);
    }
  });
  observer.observe(bridgeDiv, config);
  const getPageMockConfig = () => pageMockConfig;
  const postPageMessage = (messageData) => {
    try {
      bridgeDiv.dataset.message = JSON.stringify(messageData);
    } catch (e) {
      console.warn('解析postPageMessage出错:', e);
    }
  };
  return {
    getPageMockConfig,
    bridgeDiv,
    postPageMessage,
  };
};

const setIn = (obj, keys, value) => {
  let keyArr = keys;
  if (typeof keys === 'string') {
    keyArr = keys.split('.');
  }
  if (!Array.isArray(keyArr)) return;

  return keyArr.reduce((finalValue, key, index) => {
    if (index + 1 === keyArr.length && typeof finalValue === 'object') {
      finalValue[key] =
        typeof value === 'function' ? value(finalValue[key]) : value;
    }
    if (finalValue?.[key] !== undefined) return finalValue[key];
    if (String(Number(keyArr[index + 1])) === keyArr[index + 1]) {
      finalValue[key] = [];
      return finalValue[key];
    }

    finalValue[key] = {};
    return finalValue[key];
  }, obj);
};

const getIn = (obj, keys) => {
  let keyArr = keys;
  if (typeof keys === 'string') {
    keyArr = keys.split('.');
  }
  if (!Array.isArray(keyArr)) return;

  return keyArr.reduce((finalValue, key) => {
    return finalValue?.[key];
  }, obj);
};

const modifyResponse = (response, mappings) => {
  if (mappings) {
    mappings.forEach(({ actualDataPath, mockDataPath }) => {
      if (!actualDataPath.includes('[].')) {
        // 简单修改eg:result.success => result.successTag
        setIn(response, mockDataPath, getIn(response, actualDataPath));
      } else {
        //针对数组的修改eg:'result.data[].hobbies[].baz.name’=)"res.date[l.hobbies[l.foo.bar
        actualDataPath.split('[].').reduce(
          (total, path) => {
            return total.reduce((all, { data, index }) => {
              const value = getIn(data, path);
              if (Array.isArray(value)) {
                value.forEach((d, i) => {
                  all.push({ data: d, index: [...index, i] });
                });
                return all;
              } else {
                all.push({ data, index });
                if (index?.length) {
                  setIn(
                    response,
                    mockDataPath.replace(/\[\]\./g, () => `.${index.shift()}.`),
                    getIn(data, path),
                  );
                }
                return all;
              }
            }, [] as { data: any; index: number[] }[]);
          },
          [{ data: response, index: [] }],
        );
      }
    });
  }
  // todo: 临时打个标 后续去掉。
  response.injectValue = true;
  if (response.data) {
    response.data.injectValue = true;
  }
  return response;
};

const modifyXHRResponse = (xhr, mappings) => {
  try {
    //const response - modifyResponse(JSON.parse(xhr.responseText),mappings);
    const response = modifyResponse(
      { root: JSON.parse(xhr.responseText) },
      mappings,
    )?.root;
    Object.defineProperty(xhr, 'responseText', {
      value: JSON.stringify(response),
    });
  } catch (e) {
    console.warn('parsing responseText error:', e);
  }
};
const { getPageMockConfig, postPageMessage } = createMessageBridge();

// 获取http接口代理信息
const getHttpMockingInfo = (xhr, request, method, url, query) => {
  const mockConfig = getPageMockConfig();
  if (!mockConfig?.httpApiHostWhiteList?.includes(url.host)) {
    return {
      appMockingEnable: mockConfig.mocking,
      apiMockingEnable: false,
    };
  }

  const urlKey = `${url.host}${url.pathname}`;
  const requestData = mockConfig?.apis?.find(
    (r) => r.url === urlKey && r.method === method,
  ) as IHttpApiConfig;

  let params;
  if (request) {
    try {
      params = JSON.parse(request);
    } catch (err) {
      try {
        params = [...new URLSearchParams(request)?.entries()].reduce(
          (total, [key, value]) => {
            total[key] = value;
            return total;
          },
          {},
        );
      } catch (e) {
        console.warn('解析请求参数错误:11', e);
      }
    }
  }
  const requestParams = { ...query, ...params };
  if (!requestData) {
    return {
      appMockingEnable: mockConfig.mocking,
      apiMockingEnable: false,
    };
  }

  const responseScene =
    requestData?.scenes?.find((s) => s.active) || requestData?.scenes[0];
  const mapRuleRequest = responseScene?.mapRuleRequests?.find((ruleRequest) => {
    try {
      // eslint-disable-next-line no-new-func
      return new Function('data', `with(data){return ${ruleRequest.rule}}`)(
        requestParams,
      );
    } catch (e) {
      console.warn(`解析规则"${ruleRequest.rule}"出错`, e);
    }
    return false;
  });
  const responseText =
    mapRuleRequest?.responseText ||
    responseScene?.defaultResponse?.responseText;
  return {
    responseText,
    mode: mockConfig.mode,
    appMockingEnable: mockConfig.mocking,
    apiMockingEnable: requestData.mocking !== false,
    debugInfo: requestData.debugInfo,
    isMtop: requestData.isMtop,
    apiCapture: mockConfig.apiCapture,
  };
};
// 获取mtop接口代理信息
const getMtopMockingInfo = (mtopApi, method, params, version = '1.0') => {
  const mockConfig = getPageMockConfig();
  // eslint-disable-next-line max-len
  const requestData = mockConfig?.apis?.find(
    (r: IMtopApiConfig) =>
      r.url === mtopApi && r.version === version && r.method === method,
  ) as IMtopApiConfig;
  if (!requestData) {
    return {
      appMockingEnable: mockConfig.mocking,
      apiMockingEnable: false,
    };
  }

  const responseScene =
    requestData?.scenes?.find((s) => s.active) || requestData?.scenes[0];
  const mapRuleRequest = responseScene?.mapRuleRequests?.find((ruleRequest) => {
    try {
      // eslint-disable-next-line no-new-func
      return new Function('data', `with(data){return ${ruleRequest.rule}}`)(
        params,
      );
    } catch (e) {
      console.warn(`解析规则"${ruleRequest.rule}"出错`, e);
    }
    return false;
  });
  const responseText =
    mapRuleRequest?.responseText ||
    responseScene?.defaultResponse?.responseText;
  return {
    responseText,
    mode: mockConfig.mode,
    apiCapture: mockConfig.apiCapture,
    appMockingEnable: mockConfig.mocking,
    apiMockingEnable: requestData.mocking !== false,
    debugInfo: requestData.debugInfo,
    isMtop: requestData.isMtop,
  };
};

// sulstring可能是"//"开头，直接new URL报错，处理补全http开头。
const createURL = (urlString) => {
  const url =
    urlString.indexOf('http') === 0 ? urlString : location.protocol + urlString;
  return new URL(url);
};

//处理stop的购应代理
(function () {
  const createMtopRequest = (originMtopRequest) => {
    return function (originMtopOptions, ...args) {
      const { api, v: version, data, method } = originMtopOptions;
      const modifiedMtopOptions = { ...originMtopOptions };
      const {
        appMockingEnable,
        apiMockingEnable,
        responseText,
        mode,
        debugInfo,
        apiCapture,
      } = getMtopMockingInfo(api, method, data, version);

      if (!appMockingEnable) {
        return originMtopRequest.apply(this, [originMtopOptions, ...args]);
      }

      if (apiMockingEnable && mode === 'frontend' && !apiCapture) {
        // 处理前媒代理
        postRequestData({
          isMtop: true,
          url: api,
          method,
          requestParams: data,
          version,
        });
        const responseData = JSON.parse(responseText as string);
        console.log(
          '%c代理成功目:',
          'color: green; font-weight: bold; font-size: 16px;',
          api,
          data,
          responseData,
        );
        return Promise.resolve(responseData);
      }

      const requestParams = { ...data };
      if (apiMockingEnable && debugInfo?.requestParams?.length) {
        debugInfo.requestParams.forEach((parma) => {
          requestParams[parma.key] = parma.value;
        });
      }

      modifiedMtopOptions.data = requestParams;

      if (apiMockingEnable) {
        modifiedMtopOptions.method = debugInfo?.method || method;
        modifiedMtopOptions.type = debugInfo?.method || method;
        modifiedMtopOptions.v = debugInfo?.version || version;
        modifiedMtopOptions.url = debugInfo?.url || modifiedMtopOptions.url;
        modifiedMtopOptions.api = debugInfo?.url || modifiedMtopOptions.url;
      }
      return new Promise((resolve, reject) => {
        originMtopRequest
          .apply(this, [modifiedMtopOptions, ...args])
          .then((res) => {
            // 处理抓取

            postMtopResponseData({
              data: modifiedMtopOptions.data,
              method: modifiedMtopOptions.method,
              version: modifiedMtopOptions.v,
              url: modifiedMtopOptions.url,
              response: res,
            });
            if (debugInfo?.mappingResponse && apiMockingEnable && !apiCapture) {
              modifyResponse(
                { root: { data: res.data } },
                debugInfo.mappingResponse,
              );
            }
            resolve(res);
          })
          .catch((e) => {
            // 处理抓取
            postMtopResponseData({
              data: modifiedMtopOptions.data,
              method: modifiedMtopOptions.method,
              version: modifiedMtopOptions.v,
              url: modifiedMtopOptions.url,
              response: e,
            });
            reject(e);
          });
      });
    };
  };

  let lib = (window as any).lib;
  let _mtop;
  const descriptor = {
    get: () => _mtop,
    set: (value) => {
      let _request = value.request;
      Object.defineProperty(value, 'request', {
        get: () => _request,
        set: (val) => {
          _request = createMtopRequest(val);
        },
      });
      _mtop = value;
    },
  };
  if (lib) {
    _mtop = lib.stop || lib.__mtop;
    if (_mtop) {
      _mtop.request = createMtopRequest(_mtop.request);
    }
    Object.defineProperty(lib, 'mtop', descriptor);
    Object.defineProperty(lib, '__mtop', descriptor);
  } else {
    console.log('no lib');

    Object.defineProperty(window, 'lib', {
      get(): any {
        return lib;
      },
      set(libValue: any) {
        lib = libValue;
        _mtop = lib.mtop || lib?.__mtop;
        Object.defineProperty(lib, 'mtop', descriptor);
        Object.defineProperty(lib, '__mtop', descriptor);
      },
    });
  }
})();

(function () {
  const xhrMap = new Map();
  const { open, setRequestHeader } = XMLHttpRequest.prototype;
  XMLHttpRequest.prototype.open = function (method, path) {
    const url: URL = createURL(path);
    // mtop的聘应代理、请求魔改单独处理，不在此处解。
    const isMtop = url.pathname.includes('mtop');
    if (isMtop) {
      xhrMap.set(this, { isMtop });
      open.apply(this, arguments);
      return;
    }

    const query = {};

    [...url.searchParams].forEach((entry) => {
      query[entry[0]] = entry[1];
    });

    xhrMap.set(this, { method, url, query });

    const { appMockingEnable, mode, debugInfo, apiCapture } =
      getHttpMockingInfo(this, null, method, url, query);
    if (!appMockingEnable || mode === 'frontend' || apiCapture) {
      open.apply(this, arguments);
      return;
    }

    const actualMethod = debugInfo?.method || method;
    const actualURL = createURL(debugInfo?.url || path);
    // 如果实际的请求方法是GET，DELETE，则把魔改的入参加到地址的query上

    if (
      (actualMethod === 'GET' || actualMethod === 'DELETE') &&
      debugInfo?.requestParams?.length
    ) {
      debugInfo.requestParams.forEach((param) => {
        actualURL.searchParams.append(param.key, param.value);
      });
    }
    const args = [...arguments];
    args[0] = actualMethod;
    args[1] = actualURL.href;
    open.apply(this, args);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (key, value) {
    const xhrInfo = xhrMap.get(this) || {};
    xhrInfo.customRequestHeaders = xhrInfo.customRequestHeaders || {};
    xhrInfo.customRequestHeaders[key] = value;
    xhrMap.set(this, xhrInfo);
    if (!this.__requestHeaders) this.__requestHeaders = {};
    this.__requestHeaders[key] = value;
    setRequestHeader.apply(this, arguments);
  };
  const { send } = XMLHttpRequest.prototype;

  XMLHttpRequest.prototype.send = function (sendParams) {
    const xhr = this;
    const { method, url, query, isMtop } = xhrMap.get(xhr);
    // mtop的响应代理、请求魔改单独处理，不在此处解。
    if (isMtop) {
      send.apply(this, arguments);
      return;
    }

    const {
      appMockingEnable,
      apiMockingEnable,
      responseText,
      mode,
      debugInfo,
      apiCapture,
    } = getHttpMockingInfo(xhr, sendParams, method, url, query);

    let postResult = false;

    if (!appMockingEnable) {
      send.apply(this, arguments);
      return;
    }

    if (apiMockingEnable && mode === 'frontend' && !apiCapture) {
      setTimeout(() => {
        postRequestData({
          isMtop: true,
          url: url.href,
          method,
          query,
          requestParams: sendParams,
        });

        const responseData = JSON.parse(responseText as string);

        console.log(
          'xc代理成功目',
          'color: green; font-weight: bold; font-size: 16px;',
          url.href,
          sendParams || query,
          responseData,
        );
        Object.defineProperty(xhr, 'readyState', { value: 4 });
        Object.defineProperty(xhr, 'status', { value: 200 });
        Object.defineProperty(xhr, 'response', { value: responseText });
        Object.defineProperty(xhr, 'responseText', { value: responseText });
        xhr.onreadystatechange?.apply(xhr, new Event('readystatechange'));
        xhr.onloadend?.apply(xhr, new Event('loadend'));
        xhr.onload?.apply(xhr, new Event('load'));
        xhr.dispatchEvent(new Event('load'));
        xhr.dispatchEvent(new Event('readystatechange'));
        xhr.dispatchEvent(new Event('loadend'));
      }, 500);
      return;
    }

    // 最后处理 mode ==='backend',以及接口数据抓取
    let _onloadend = xhr.onloadend;
    xhr.onloadend = () => {
      if (!postResult) {
        postResult = true;
        postHttpResponseData(xhr, xhrMap.get(xhr), sendParams);
        if (!apiCapture && apiMockingEnable && debugInfo?.mappingResponse) {
          modifyXHRResponse(xhr, debugInfo.mappingResponse);
        }
      }
      if (typeof _onloadend === 'function') {
        _onloadend.apply(xhr, arguments);
      }
    };

    Object.defineProperty(xhr, 'onloadend', {
      get: () => _onloadend,
      set: (value) => {
        _onloadend = value;
      },
    });

    let _onreadystatechange = xhr.onreadystatechange;
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && !postResult) {
        postResult = true;
        postHttpResponseData(xhr, xhrMap.get(xhr), sendParams);

        if (!apiCapture && apiMockingEnable && debugInfo?.mappingResponse) {
          modifyXHRResponse(xhr, debugInfo.mappingResponse);
        }
      }
      if (typeof _onreadystatechange === 'function') {
        _onreadystatechange.apply(xhr, arguments);
      }
    };
    Object.defineProperty(xhr, 'onreadystatechange', {
      get: () => _onreadystatechange,
      set: (value) => {
        _onreadystatechange = value;
      },
    });
    if (!debugInfo?.requestParams?.length) {
      send.call(xhr, sendParams);
      return;
    }
    let sendParamString;

    try {
      // @ts-ignore
      const actualSendParams = JSON.parse(sendParams || '{}');
      debugInfo.requestParams.forEach((param) => {
        actualSendParams[param.key] = param.value;
      });
      sendParamString = JSON.stringify(actualSendParams);
    } catch (err) {
      try {
        const actualSendParams = new URLSearchParams(sendParams as string);
        debugInfo.requestParams.forEach((param) => {
          actualSendParams.append(param.key, param.value);
        });
        sendParamString = actualSendParams.toString();
      } catch (e) {
        console.warn('解析sendParams出错', e);
      }
    }
    send.call(xhr, sendParamString);
  };
})();
