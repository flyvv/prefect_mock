const createId = () => String(Date.now());

// 由于每次并行异步读写storage，导致数据写入相互覆盖的问题。需要将并行读写storage操作推入队列中，逐条写入
const createStorageActionQueueUp = () => {
  const updateQueue: any[] = [];
  const queueUp = (handler: () => Promise<any>) => {
    return new Promise((resolve, reject) => {
      const currentHandler = () => {
        return handler()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            updateQueue.shift();
            runQueue();
          });
      };
      updateQueue.push(currentHandler);
      if (currentHandler === updateQueue[0]) {
        runQueue();
      }
    });
  };

  const runQueue = () => {
    return updateQueue[0]?.();
  };

  return queueUp;
};

const storageActionQueueUp = createStorageActionQueueUp();

const getPageInfo = async (currentPageUrl) => {
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

const getPageMockConfigFromStorage = async (currentPageUrl?: string) => {
  const storage = await chrome.storage.local.get('config');
  if (!storage.config) return;

  const {
    mocking,
    defaultRequestContentType,
    httpApiHostWhiteList,
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
    httpApiHostWhiteList,
    mode,
    ignoreParams,
    apiCapture: !!apiCapture,
    apis,
  };
  return { pageMockConfig, pageInfo, updateProjects };
};

const handleUpdatePageInfo = async (data: TUpdateApiInfo) => {
  const res = await getPageMockConfigFromStorage(data.url);

  if (!res) return;

  const { pageInfo, updateProjects } = res;

  if (!pageInfo) return;

  Object.keys(data).forEach((key) => {
    pageInfo[key] = data[key];
  });

  return updateProjects();
};
const handleRemovePage = async ({ url }) => {
  const { projects } = await chrome.storage.local.get('projects');
  const currentProject: IProject = projects?.find((p) => p.active);
  const currentVersion: IVersion | undefined = currentProject?.versions?.find(
    (p) => !p.locked,
  );
  const removeIndex = currentVersion?.pages?.findIndex((p) => p.url === url);
  if (removeIndex === undefined || removeIndex === -1) return;
  currentVersion?.pages?.splice?.(removeIndex, 1);
  console.log('handleRemovePage');
  return await chrome.storage.local.set({ projects });
};

const handleCreatePage = async (data: { url: string; title: string }) => {
  const { projects } = await chrome.storage.local.get('projects');
  const currentProject: IProject = projects?.find((p) => p.active);
  const currentVersion: IVersion | undefined = currentProject?.versions?.find(
    (p) => !p.locked,
  );
  // const isExist = currentVersion?.pages?.find(p => p.url === data.url);// if(isExist)return;
  console.log('handleCreatePage', data);

  currentVersion?.pages.push({
    ...data,
    apiCapture: false,
    apis: [],
  });

  return await chrome.storage.local.set({ projects });
};

const handleUpdateProject = async ({ id, name, desc }: IProject) => {
  const { projects } = await chrome.storage.local.get('projects');
  const projectIndex = projects.findIndex((p) => p.id === id);
  if (projectIndex == -1) {
    projects.push({
      id,
      name,
      desc,
      versions: [{ locked: false, id: createId(), version: 1, pages: [] }],
    });
  } else {
    projects[projectIndex].name = name;
    projects[projectIndex].desc = desc;
  }
  return await chrome.storage.local.set({ projects });
};

const handleUpdateProjects = async (projects: IProject[]) => {
  return await chrome.storage.local.set({ projects });
};

const handleUpdateActiveProject = async ({ id }) => {
  const { projects } = await chrome.storage.local.get('projects');
  projects.forEach((project) => {
    project.active = project.id === id;
  });

  return await chrome.storage.local.set({ projects });
};
const handleRemoveProject = async ({ id }) => {
  const { projects } = await chrome.storage.local.get('projects');
  const projectIndex = projects.findIndex((p) => p.id === id);
  if (projectIndex === -1 || projects.length === 1) return;

  projects.splice(projectIndex, 1);
  projects[0].active = true;
  return await chrome.storage.local.set({ projects });
};

const handleUpdateApiInfo = async (data: TUpdateApiInfo) => {
  const res = await getPageMockConfigFromStorage(data.pageUrl);
  if (!res) return;

  const { pageMockConfig: pageInfo, updateProjects } = res;

  const apiInfo = pageInfo.apis.find((api) => api.url === data.url);
  if (!apiInfo) return;
  Object.keys(data).forEach((key) => {
    apiInfo[key] = data[key];
  });
  return updateProjects();
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('onMessage', request.type, request.data);
  switch (request.type) {
    case 'updateApiInfo':
      storageActionQueueUp(() => handleUpdateApiInfo(request.data));
      break;
    case 'createPage':
      storageActionQueueUp(() => handleCreatePage(request.data));
      break;
    case 'updatePageInfo':
      storageActionQueueUp(() => handleUpdatePageInfo(request.data));
      break;
    case 'removePage':
      storageActionQueueUp(() => handleRemovePage(request.data));
      break;
    case 'updateProject':
      storageActionQueueUp(() => handleUpdateProject(request.data));
      break;
    case 'updateProjects':
      storageActionQueueUp(() => handleUpdateProjects(request.data));
      break;
    case 'updateActiveProject':
      storageActionQueueUp(() => handleUpdateActiveProject(request.data));
      break;
    case 'removeProject':
      storageActionQueueUp(() => handleRemoveProject(request.data));
      break;
  }
});
