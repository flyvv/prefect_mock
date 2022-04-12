import { useEffect, useState } from 'react';
import {
  Button,
  Divider,
  Form,
  Modal,
  Select,
  Switch,
  Radio,
  Input,
} from 'antd';
import cls from 'classnames';
import './index.less';
import { InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';

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

interface IProps {
  config: IMockConfig;
}

export default function AppHeader(props: IProps) {
  const [config, setConfig] = useState<IMockConfig>(props.config);

  const [modalVisible, setModalVisible] = useState(
    !props.config?.httpApiHostWhiteList?.length < 0,
  );

  useEffect(() => {
    chrome.storage.local.set({ config });
  }, [config]);

  const handleExportConfig = () => {
    chrome.storage.local.get().then((res) => {
      let str = '';
      try {
        str = JSON.stringify({ config: res.config, projects: res.projects });
      } catch (error) {}
      createDownloadFile(str, 'config');
    });
  };

  return (
    <header className={'container'}>
      <div className={'brand'}>
        <Radio.Group
          options={[
            { label: '前端视角', value: 'frontend' },
            { label: '后端视角', value: 'backend' },
          ]}
          onChange={(ev) => {
            setConfig((setting) => ({ ...setting, mode: ev.target.value }));
          }}
          value={config?.mode}
          optionType="button"
          buttonStyle="solid"
        />
      </div>

      <div className={'action'}>
        <Switch
          checked={!!config?.mocking}
          onChange={(val) => {
            setConfig((setting) => ({ ...setting, mocking: val }));
          }}
        />
        <Button.Group size="small" style={{ marginLeft: 10 }}>
          <Button icon={<InfoCircleOutlined />} />
          <Button
            icon={<SettingOutlined />}
            onClick={() => {
              setModalVisible(true);
            }}
          />
        </Button.Group>
      </div>

      <Modal
        visible={modalVisible}
        destroyOnClose
        maskClosable={false}
        onCancel={() => {
          setModalVisible(false);
        }}
        closable={false}
        title="编辑全局配置"
        footer={
          <Button
            type="primary"
            onClick={() => {
              if (
                !config.httpApiHostWhiteList?.length &&
                !confirm(
                  '您未输入接口域名白名单，这将导致您的页面http接口不能被正确处理，确认离开？',
                )
              )
                return;
              setConfig((setting) => ({ ...setting }));
              setModalVisible(false);
            }}
          >
            确定
          </Button>
        }
      >
        <Form labelCol={{ span: 8 }}>
          <Form.Item
            label="接口域名白名单"
            tooltip="仅接口域名在白名单中的接口会被插件处理，输入域名 eg:bp.aliexpress.com"
          >
            <Select
              mode="multiple"
              placeholder="务必注意，此项未设置将导致http接口失效"
              value={config?.httpApiHostWhiteList}
              onChange={(list) => {
                setConfig((setting) => ({
                  ...setting,
                  httpApiHostWhiteList: list,
                }));
              }}
              dropdownRender={(menu) => (
                <div>
                  <Divider style={{ margin: '4px 0' }} />
                  <Button
                    onClick={() => {
                      const hostString = prompt('添加');
                      if (!hostString) return;
                      const list = config?.httpApiHostWhiteList
                        ? [...config?.httpApiHostWhiteList, hostString]
                        : [hostString];
                      setConfig((setting) => ({
                        ...setting,
                        httpApiHostWhiteList: list,
                      }));
                    }}
                  >
                    添加
                  </Button>
                </div>
              )}
            >
              {config?.httpApiHostWhiteList?.map((v) => {
                <Select.Option value={v} key={v}>
                  {v}
                </Select.Option>;
              })}
            </Select>
          </Form.Item>

          <Form.Item
            label="过滤请求参数"
            tooltip="部分请求参数是系统自带，与业务无关可在此处过滤口如spm"
          >
            <Select
              mode="multiple"
              placeholder="输入忽略差数"
              value={config?.ignoreParams}
              onChange={(list) => {
                setConfig((setting) => ({ ...setting, ignoreParams: list }));
              }}
              dropdownRender={(menu) => (
                <div>
                  <Divider style={{ margin: '4px 0' }} />
                  <Button
                    onClick={() => {
                      const hostString = prompt('添加');
                      if (!hostString) return;
                      const list = config?.ignoreParams
                        ? [...config?.ignoreParams, hostString]
                        : [hostString];
                      setConfig((setting) => ({
                        ...setting,
                        ignoreParams: list,
                      }));
                    }}
                  >
                    添加
                  </Button>
                </div>
              )}
            >
              {config.ignoreParams?.map((v) => (
                <Select.Option value={v} key={v}>
                  {v}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="默认http提交数据类型">
            <Select
              value={config.defaultRequestContentType}
              style={{ width: 280 }}
              onChange={(val) =>
                setConfig((settings) => ({
                  ...settings,
                  defaultRequestContentType: val,
                }))
              }
            >
              <Select.Option value="application/json">
                application/json
              </Select.Option>
              <Select.Option value="application/x-www-form-urlcncoded">
                application/x-www-form-urlcncoded
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="导出全局配置">
            <Button onClick={handleExportConfig}>点击下载</Button>
          </Form.Item>
        </Form>
      </Modal>
    </header>
  );
}
