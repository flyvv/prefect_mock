import styles from './index.less';

import { Tabs } from 'antd';

const { TabPane } = Tabs;
export default function Header() {
  const callback = () => {};
  return (
    <Tabs defaultActiveKey="1" onChange={callback}>
      <TabPane tab="前端视角" key="1">
        前端视角
      </TabPane>
      <TabPane tab="前端视角" key="2">
        后端视角
      </TabPane>
    </Tabs>
  );
}
