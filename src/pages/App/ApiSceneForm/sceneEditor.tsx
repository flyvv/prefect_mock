import { Form, Input, Button } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { createId } from '../../../utils';
import style from './index.module.less';
import Editor from '../Editor';
interface IProps {
  scene: IScene;

  onSubmit: (value: IScene) => void;
}

/**
 *API 场景表单*/
export function SceneEditor(props: IProps) {
  const { scene, onSubmit } = props;
  const [form] = Form.useForm();
  return (
    <div>
      <Form
        initialValues={scene}
        labelCol={{ span: 5 }}
        form={form}
        onFinish={(values) => onSubmit({ ...scene, ...values })}
      >
        <Form.Item label="场景名称" name="name" rules={[{ required: true }]}>
          <Input placeholder="例如:请求参数变化" />
        </Form.Item>

        <Form.List name="mapRuleRequests">
          {(fields, { add, remove }) => {
            return (
              <>
                {fields.map((field) => (
                  <div className={style.ruleItem} key={field.key}>
                    <Form.Item label="匹配名" name={[field.name, 'ruleName']}>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label="匹配规则"
                      name={[field.name, 'rule']}
                      rules={[{ required: true, message: 'Missing sight' }]}
                    >
                      <Input placeholder="例如国id === '123'&& price > 12" />
                    </Form.Item>
                    <Form.Item
                      hidden
                      name={[field.name, 'id']}
                      initialValue={createId()}
                    >
                      <Input placeholder="例如Did == '123' && price > 12" />
                    </Form.Item>
                    <Form.Item
                      label="响应数据"
                      name={[field.name, 'responseText']}
                      rules={[
                        { required: true, message: 'Missing responseText' },
                      ]}
                    >
                      <Editor
                        theme="vs-dark"
                        language="json"
                        width={400}
                        height={400}
                      />
                    </Form.Item>
                    <div className={style.ruleRemoveBtn}>
                      <MinusCircleOutlined
                        onClick={() => {
                          remove(field.name);
                        }}
                      />
                    </div>
                  </div>
                ))}
                <Form.Item
                  label="添加匹配规则"
                  tooltip="可通过接口入参匹配，模拟响应不同的出参。
如入参名pageIndex值为1时模拟响应第一页数据】当入参pageIndex值为2时模拟响应第二页数据"
                >
                  <Button
                    type="dashed"
                    onClick={() => {
                      add();
                    }}
                    icon={<PlusOutlined />}
                  >
                    添加
                  </Button>
                </Form.Item>
              </>
            );
          }}
        </Form.List>

        <Form.Item
          label="默认返回"
          name={['defaultResponse', 'responseText']}
          rules={[{ required: true }]}
        >
          <Editor theme="vs-dark" language="json" width={450} height={400} />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 5 }}>
          <Button type="primary" htmlType="submit">
            提交修改
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
