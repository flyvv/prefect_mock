export const updateApiInfo = (data: TUpdateApiInfo) => {
  const newLocal = chrome.runtime;
  newLocal.sendMessage({
    type: 'updateApiInfo',
    data,
  });
};
export const updatePageInfo = (data) => {
  chrome.runtime.sendMessage({ type: 'updatePageInfo', data });
};
export const createPage = (data) => {
  chrome.runtime.sendMessage({ type: 'createPage', data });
};

export const updateStorageProjects = (data) => {
  chrome.runtime.sendMessage({ type: 'updateProjects', data });
};
export const removePage = (data: { url: string }) => {
  chrome.runtime.sendMessage({ type: 'removePage', data });
};

export const updateProject = (data: IProject) => {
  chrome.runtime.sendMessage({ type: 'updateProject', data });
};

export const updateProjects = (data: IProject[]) => {
  chrome.runtime.sendMessage({ type: 'updateProjects', data });
};
export const removeProject = (data: { id: string }) => {
  chrome.runtime.sendMessage({ type: 'removeProject', data });
};

export const updateActiveProject = (data: { id: string }) => {
  chrome.runtime.sendMessage({
    type: 'updateActiveProject',
    data,
  });
};
