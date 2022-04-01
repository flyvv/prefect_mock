import { Button, Form, Input, Select, Switch } from 'antd';
import { useState } from 'react';
// import AESPluginEvent from '@/utils/mockAesTrackerPluginevent';
export interface ApiFormProps {
  onChange: (values: TApiConfig) => void;
  activeApi: TApiConfig;
}

const HTTPMethods = ['GET', 'POST', 'PUT', 'DELETE'];
// Api 基本信息编辑
export function ApiBaseForm(props: ApiFormProps) {
  const { onChange, activeApi } = props;
  const [isMtop, setIsMtop] = useState(activeApi.isMtop);
  const [formRef] = Form.useForm();

  function onFinish(values) {
    onChange({ ...activeApi, ...values });
  }

  const handleValuesChange = (values) => {
    if (typeof values.isMtop === 'boolean') {
      setIsMtop(values.isMtop);
    }
  };

  return (
    <>
      <Form
        labelCol={{ span: 5 }}
        form={formRef}
        onValuesChange={handleValuesChange}
        onFinish={onFinish}
      >
        <Form.Item
          label="接口名称"
          name="name"
          initialValue={activeApi.name}
          rules={[{ required: true }]}
        >
          <Input placeholder="设置接口" />
        </Form.Item>
        <Form.Item
          label="接口地址"
          name="url"
          initialValue={activeApi.url}
          rules={[{ required: true }]}
        >
          <Input placeholder="https://api.mock.com/api/v1/" />
        </Form.Item>
        <Form.Item
          label="是否Mtop"
          name="isMtop"
          initialValue={activeApi.isMtop}
          rules={[{ required: true }]}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>{' '}
        <Form.Item
          label="请求方法"
          name="method"
          initialValue={activeApi.method || 'get'}
          rules={[{ required: true }]}
        >
          <Select>
            {HTTPMethods.map((item) => (
              <Select.Option value={item} key={item}>
                {item.toUpperCase()}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        {isMtop ? (
          <Form.Item
            label="API版本"
            name="version"
            initialValue={(activeApi as IMtopApiConfig).version}
            rules={[{ required: true }]}
          >
            <Input placeholder="1.0" />
          </Form.Item>
        ) : (
          <Form.Item
            label="数据提交格式"
            name="requestContentType"
            initialValue={(activeApi as IHttpApiConfig).requestContentType}
            required
          >
            <Select size="middle" placeholder="数据提交格式">
              <Select.Option values="application/json">
                {' '}
                application / json
              </Select.Option>
              <Select.Option value="application/x-www-form-urlencoded">
                {' '}
                application / x - ww - form - urlencoded
              </Select.Option>
            </Select>
          </Form.Item>
        )}
        <Form.Item
          label="接口描述"
          name="description"
          initialValue={activeApi.description}
        >
          <Input.TextArea />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 5 }}>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
