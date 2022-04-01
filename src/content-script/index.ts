{
  const createId = () => String(Date.now());

  const pageUrl = window.location.host + window.location.pathname;
  let bridgeDiv;

  const getPageInfo = async (currentPageUrl = pageUrl) => {
    const { projects } = await chrome.storage.local.get('projects');
    const currentProject: IProject = projects?.find((p) => p.active);
    const currentVersion: IVersion | undefined = currentProject?.versions?.find(
      (p) => !p.locked,
    );
    const currentPage = currentVersion?.pages?.find(
      (p) => p.url === currentPageUrl,
    );
    const updateProjects = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          chrome.storage.local.set({ projects }).then(resolve).catch(reject);
        }, 1000);
      });
    };

    return { currentPage, updateProjects };
  };

  async function injectedScript(onReady) {
    const res = await getPageMockConfigFromStorage();

    document.documentElement.setAttribute(
      'data-toolConfig',
      JSON.stringify(res?.pageMockConfig || {}),
    );

    const script = document.createElement('script');
    script.type = 'text/javascript';

    script.src = `chrome-extension:${chrome.runtime.id}/page-script/index.js`;
    document.getElementsByTagName('html')[0].prepend(script);
    script.onload = () => {
      onReady?.();
    };
  }

  const getPageMpckConfigFromstorage = async (currentPageUrl?: string) => {
    const storage = await chrome.storage.local.get('config');
    if (!storage.config) return;
    const {
      mocking,
      defaultRequestContentType,
      httpApiHostwhiteList,
      mode,
      ignoreParams,
    } = storage.config;
    const { currentPage: pageInfo, updateProjects } = await getPageInfo(
      currentPageUrl,
    );
    if (!pageInfo) return;
    const { apiCapture, apis } = pageInfo;
    const pageMockConfig: IPageConfig = {
      mocking,
      defaultRequestContentType,
      httpApiHostwhiteList,
      mode,
      ignoreParams,
      apiCapture: !apiCapture,
      apis,
    };

    return { pageMockConfig, pageInfo, updateProjects };
  };

  const handleResponseData = async (responseData: IResponseData) => {
    // 处理抓取数据
    const res = await getPageMockConfigFromStorage();
    if (!res) return;
    const { pageMockConfig: pageInfo, updateProjects } = res;

    let isApiInWhiteList = responseData.isMtop;
    if (!responseData.isMtop && responseData.url && responseData.host) {
      isApiInWhiteList = pageInfo?.httpApiHostwhiteList?.includes(
        responseData.host,
      );

      if (!isApiInWhiteList || !pageInfo.mocking) return;

      if (pageInfo.mode === 'frontend' && pageInfo.apiCapture) {
        const apiInfo: TApiConfig = pageInfo.apis.find(
          (api) => api.url === responseData.url,
        );
        const responseText = responseData.isMtop
          ? JSON.stringify(responseData.response)
          : responseData.responseText;

        const { isMtop, method, requestContentType } = responseData;

        let requestParams;

        if (isMtop) {
          requestParams =
            typeof responseData.requestParams === 'string'
              ? JSON.parse(responseData.requestParams)
              : responseData.requestParams;
        } else if (['GET', 'DELETE'].includes(method)) {
          requestParams = responseData.query;
        } else if (responseData.requestParams) {
          if (requestContentType === 'application/x-www-form-urlencoded') {
            const params = new URLSearchParams(responseData.requestParams);
            requestParams = [...params].reduce((total, [key, value]) => {
              total[key] = value;
              return total;
            }, {});
          } else {
            requestParams = JSON.parse(responseData.requestParams as string);
          }

          pageInfo.ignoreParams?.forEach((key) => {
            delete requestParams[key];
          });

          const scene: IScene = {
            name: '抓取的响应数据',
            id: createId(),
            active: true,
            defaultResponse: {
              responseText,
            },
          };

          const parmas = Object.entries(requestParams);
          if (parmas.length) {
            const rule = parmas
              .map((p) =>
                String(Number(p[1])) === p[1] || p[1] === null
                  ? `${p[0]} == ${p[1]}`
                  : `${p[0]} == '${p[1]}'`,
              )
              .join(' && ');

            scene.temporaryMapRuleRequest = {
              id: createId(),
              rule,
              latestParams: requestParams,
              responseText,
            };

            if (apiInfo) {
              if (!apiInfo.scenes?.length) {
                apiInfo.scenes = [scene];
              } else {
                // 此处逻辑尝试对接口多态做处理
                //-当前响应无匹配规则，更新场景接口默认响应
                //-如果接口单次或多次被调用无入参，不显示匹配规则// -如果接口多次被调用入参都一样，不显示匹配规则// -如果接口首次无入参，二次有入参，显示匹配规则。
                // -如果接口多次被调用入参存在一样，显示匹配规则，所以需要先缓存下匹配规则，判断是否存在多次调用入参不一致情况
                //-当前响应无匹配规则，更新场景接口默认响应
                if (!scene.temporaryMapRuleRequest) {
                  apiInfo.scenes[0].defaultResponse = scene.defaultResponse;
                  return;
                }
                if (!apiInfo.scenes[0].mapRuleRequests) {
                  //后续入参有匹配规则存在且当前接口无匹配规则，覆盖临时匹配规则
                  if (!apiInfo.scenes[0].temporaryMapRuleRequest) {
                    apiInfo.scenes[0].temporaryMapRuleRequest =
                      scene.temporaryMapRuleRequest;
                    return;
                  }
                  // 如果接口多次被调用入参一样，不显示匹配规则// todo:拼配规则的精细匹配
                  if (
                    scene.temporaryMapRuleRequest.rule ===
                    apiInfo.scenes[0].temporaryMapRuleRequest?.rule
                  )
                    return;
                  //当前的临时匹配规则与接口之前的临时匹配规则不一致，添加到接口mapRuleRequests中,并且删除接口temporaryMaprulerequest
                  apiInfo.scenes[0].mapRuleRequests = [
                    apiInfo.scenes[0].temporaryMapRuleRequest,
                    scene.temporaryMapRuleRequest,
                  ];
                  delete apiInfo.scenes[0].temporaryMapRuleRequest;
                } else {
                  //入参在之前的列表中存在，不处理
                  const isExist = apiInfo.scenes[0].mapRuleRequests?.find(
                    (req) => req.rule === scene.temporaryMapRuleRequest?.rule,
                  );
                  if (isExist) return;
                  //当前的临时匹配规则与接口之前的匹配规则不一致，添加到接口mapRuleRequests中
                  apiInfo.scenes[0].mapRuleRequests = [
                    ...apiInfo.scenes[0]?.mapRuleRequests,
                    scene.temporaryMapRuleRequest,
                  ];
                }
              }
            } else if (responseData.isMtop) {
              pageInfo.apis.push({
                id: createId(),
                mocking: true,
                //@ts-ignore
                name: '抓取的接口',
                description: '来自页面抓取的接口',
                url: responseData.url,
                method: responseData.method,
                scenes: [scene],
                // defaultResponseText: responseText,
                version: responseData.version,
                isMtop: true,
                latestParams: requestParams,
              });
            } else {
              pageInfo.apis.push({
                id: createId(),
                mocking: true,
                isMtop: false,
                // @ts-ignore
                name: '抓取的接口',

                description: '来自页面抓取的接口',
                url: responseData.url,
                method: responseData.method,
                scenes: [scene],
                // defaultResponseText: responseText,
                requestContentType: requestContentType as TRequestContentType,
                latestParams: requestParams,
              });
            }

            return await updateProjects();
          } else {
            storageActionQueueUp(() => {
              return new Promise((resolve, reject) => {
                chrome.storage.local
                  .get('runtimeResponse')
                  .then(({ runtimeResponse }) => {
                    const pageRuntimeResponse = runtimeResponse[pageUrl] || {};
                    pageRuntimeResponse[
                      `${responseData.method}/${responseData.url}`
                    ] = responseData;
                    runtimeResponse[pageUrl] = pageRuntimeResponse;
                    chrome.storage.local
                      .set({ runtimeResponse })
                      .then(resolve)
                      .catch(reject);
                  })
                  .catch(reject);
              });
            });
          }
        }
      }
    }
  };
}
