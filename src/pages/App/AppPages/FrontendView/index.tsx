import {
  Button,
  Modal,
  Form,
  Input,
  Popover,
  Popconfirm,
  Table,
  Radio,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createPage,
  updateApiInfo,
  updatePageInfo,
} from '../../../../utils/action';
import ApiEditor from '../../ApiEditor';
import {
  ToolOutlined,
  StarOutlined,
  UnorderedListOutlined,
  StarFilled,
} from '@ant-design/icons';
import style from './index.less';
import { createId } from '../../../../utils';
import produce from 'immer';
import { message } from 'antd';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

const isResponseModified = (record) => {
  const apiValueKeys = [
    'name',
    'description',
    'url',
    'method',
    'scenes',
    'version',
    'isMtop',
    'requestContentType',
  ];
  return (
    (record.isLatest && !record.previousApi) ||
    (record.previousApi &&
      !isEqual(
        pick(record, apiValueKeys),
        pick(record.previousApi, apiValueKeys),
      ))
  );
};

const FrontendView = ({
  config,
  currentPageUrl,
  pageTitle,
  pageInfo: initPageInfo,
  ...props
}) => {
  const [createPageVisible, setCreatePageVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'star' | 'changed'>('all');
  const [isNewApi, setIsNewApi] = useState(false);
  const [pageInfo, setPageInfo] = useState<IPage>(
    initPageInfo || { url: currentPageUrl, title: pageTitle },
  );
  const actionDisabled = currentPageUrl !== pageInfo.url;

  useEffect(() => {
    setPageInfo(initPageInfo || { url: currentPageUrl, title: pageTitle });
  }, [initPageInfo]);

  const [activeApiData, setActiveApiData] = useState<TApiConfig>();
  const [form] = Form.useForm();
  //编辑接口
  function handleEditApi(record) {
    setActiveApiData(record);
    setIsNewApi(false);
  }

  const dataSource = useMemo(() => {
    return pageInfo.apis?.filter((api) => {
      if (search && !api.url.includes(search)) return false;
      if (filter === 'star' && !api.stared) return false;
      if (filter === 'changed' && !isResponseModified(api)) return false;
      return true;
    });
  }, [pageInfo.apis, filter, search]);

  //删除接口
  function handleDeleteApi(record) {
    const newApis = pageInfo.apis.filter((api) => api.id !== record.id);
    setPageInfo((state) => ({
      ...state,
      apis: newApis,
    }));
    updatePageInfo({
      apis: newApis,
      url: pageInfo.url,
    });
  }

  // 标星接口
  function handleStaredApi(apiData) {
    setPageInfo((state) =>
      produce(state, (draft) => {
        const index = pageInfo.apis.findIndex((api) => api.id === apiData.id);
        if (index === -1) return;
        const newApiData = { ...apiData };
        newApiData.pageUrl = pageInfo.url;
        newApiData.stared = !newApiData.stared;
        draft.apis[index] = newApiData;
        updateApiInfo(newApiData);
      }),
    );
  }

  // 更新接口
  function updateApi(apiData) {
    if (!apiData.url) {
      message.error('请先提交接口基本配置信息');
      return;
    }

    const index = pageInfo.apis.findIndex((api) => api.id === apiData.id);
    if (index === -1) {
      // 添加新接口
      setPageInfo((state) =>
        produce(state, (draft) => {
          const apis = [...state.apis, { isLatest: true, ...apiData }];

          draft.apis = apis;

          updatePageInfo({
            url: pageInfo.url,
            apis,
          });
        }),
      );
    } else {
      // 修改接口
      setPageInfo((state) =>
        produce(state, (draft) => {
          let { previousApi } = draft.apis[index];
          if (!previousApi) {
            draft.apis[index].isLatest = false;
            previousApi = cloneDeep(draft.apis[index]);
          }
          apiData.isLatest = true;
          apiData.previousApi = previousApi;
          apiData.pageUrl = pageInfo.url;

          draft.apis[index] = apiData;
          updateApiInfo(apiData);
        }),
      );
    }
    setActiveApiData(apiData);
    message.success('接口信息已更新');
  }

  function closeApiModal() {
    setActiveApiData(undefined);
  }

  const handleActiveSceneChange = (record: TApiConfig, activeId) => {
    setPageInfo((state) => {
      const newState = produce(state, (draft) => {
        const currentApi = draft.apis.find((api) => api.id === record.id);
        if (!currentApi) return;
        console.log('currentApi', currentApi, state);
        currentApi.scenes?.forEach((scene) => {
          scene.active = scene.id === activeId;
        });
      });

      updatePageInfo(newState);

      return newState;
    });
  };

  const title = (
    <div>
      接口地址
      <Input
        onChange={(event) => setSearch(event.target.value)}
        value={search}
        style={{ width: '240px', marginLeft: '20px', marginRight: '20px' }}
        size="small"
        placeholder="接口搜索"
      />
      <Radio.Group
        options={[
          { label: <UnorderedListOutlined />, value: 'all' },
          { label: <StarOutlined />, value: 'star' },
          { label: <ToolOutlined />, value: 'changed' },
        ]}
        onChange={(event) => {
          setFilter(event.target.value);
        }}
        value={filter}
        optionType="button"
        buttonStyle="solid"
        size="small"
      />
    </div>
  );

  const tableColumns = [
    {
      title,
      dataIndex: 'url',
      width: '480px',
      render: (text, record: TApiConfig) => {
        const activeId =
          record?.scenes?.find((s) => s.active)?.id || record?.scenes?.[0]?.id;
        let changes;
        if (isResponseModified(record)) {
          changes = (
            <Popover placement="topRight" content={<div>存在变更</div>}>
              <ToolOutlined />
            </Popover>
          );
        }
        return (
          <div className={style.urlBox}>
            <h4 title={`${record.name}:${record.url}`}>
              {changes}
              {record.url}
            </h4>
            <div>
              <span>激活mock场景:</span>

              <Radio.Group
                size="small"
                value={activeId}
                onChange={(ev) =>
                  handleActiveSceneChange(record, ev.target.value)
                }
                className={style.sceneSelect}
              >
                {record?.scenes?.map((scene) => (
                  <Radio key={scene.id} value={scene.id}>
                    {scene.name}
                  </Radio>
                ))}
              </Radio.Group>
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (text, record) => (
        <Button.Group size="small">
          <Button
            onClick={() => {
              handleEditApi(record);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除接口，删除后无法恢复"
            placement="topRight"
            onConfirm={() => {
              handleDeleteApi(record);
            }}
          >
            <Button>删除</Button>
          </Popconfirm>
          <Button
            onClick={() => {
              handleStaredApi(record);
            }}
          >
            {record.stared ? <StarFilled /> : <StarOutlined />}
          </Button>
        </Button.Group>
      ),
    },
  ];

  if (!initPageInfo) {
    return (
      <div>
        <Button
          disabled={actionDisabled}
          onClick={() => {
            chrome.tabs.reload(() => {
              setCreatePageVisible(true);
            });
          }}
        >
          创建页面
        </Button>
        {createPageVisible && (
          <Modal
            centered
            title="输入页面基本信息"
            width={700}
            visible
            onOk={() => {
              createPage(pageInfo);
              setCreatePageVisible(false);
            }}
            onCancel={() => {
              setCreatePageVisible(false);
            }}
            cancelText="关闭"
            okText="确定"
          >
            <Form
              form={form}
              onValuesChange={(value) => {
                setPageInfo((s) => ({ ...s, ...value }));
              }}
            >
              <Form.Item name="url" label="页面地址">
                <Input defaultValue={currentPageUrl} disabled />
              </Form.Item>
              <Form.Item name="title" label="页面标题">
                <Input defaultValue={pageTitle} />
              </Form.Item>
            </Form>
          </Modal>
        )}
      </div>
    );
  }

  const handleCreateApi = () => {
    setIsNewApi(true);
    setActiveApiData({
      id: createId(),
      isMtop: false,
      isLatest: true,
      requestContentType: config.defaultRequestContentType,
      url: '',
      name: '',

      // @ts-ignore
      version: '1.0',
      method: 'GET',
      scenes: [],
    });
  };

  return (
    <div className="backendContainer">
      <div>
        <div className={style.pageAction}>
          <div className={style.flexItem}>
            {pageInfo.url ? (
              <>
                <strong>页面地址:</strong>
                {pageInfo.url}
              </>
            ) : null}
          </div>
          <Button
            disabled={actionDisabled}
            style={{ marginBottom: 10 }}
            onClick={() => {
              setPageInfo((page: IPage) => {
                console.log(page, 'page');

                const pageInfo = { ...page, apiCapture: !page.apiCapture };
                updatePageInfo(pageInfo);
                return pageInfo;
              });
            }}
          >
            {pageInfo?.apiCapture ? '停止抓取' : '抓取页面接口'}
          </Button>
          <Button style={{ marginBottom: 10 }} onClick={handleCreateApi}>
            添加接口
          </Button>
        </div>
        <Table
          loading={pageInfo?.apiCapture}
          dataSource={dataSource}
          columns={tableColumns}
          size="small"
          pagination={{ pageSize: 20 }}
          scroll={{ y: 340 }}
        />
      </div>
      {activeApiData && (
        <Modal
          centered
          visible
          title="编辑接口"
          destroyOnClose
          footer={null}
          width={700}
          onCancel={closeApiModal}
        >
          <ApiEditor
            onChange={updateApi}
            isNewApi={isNewApi}
            activeApi={activeApiData}
          />
        </Modal>
      )}
    </div>
  );
};

export default FrontendView;
