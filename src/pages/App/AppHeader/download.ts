const createDownloadFile = (cstr: string, filename: string) => {
  let doc = URL.createObjectURL(
    new Blob([cstr], { type: 'application/octet-binary' }),
  );
  chrome.downloads.download({
    url: doc,
    filename,
    conflictAction: 'overwrite',
    saveAs: true,
  });
};
