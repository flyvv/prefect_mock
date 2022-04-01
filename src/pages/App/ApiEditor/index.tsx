import { Tabs } from 'antd';
import { ApiBaseForm } from '../ApiBaseForm';
import { ApiSceneForm } from '../ApiSceneForm';
import { useState } from 'react';

interface IApiEditorProps {
  onChange: (values: TApiConfig) => void;
  activeApi: TApiConfig;
  isNewApi: boolean; // 是否是新建的接口
}

const Apieditor = ({ activeApi, isNewApi, onChange }: IApiEditorProps) => {
  const [activeTab, setActiveTab] = useState(isNewApi ? 'base' : 'scenes');

  const handleScenesChange = (scenes: IScene[]) => {
    onChange({ ...activeApi, scenes });
  };

  const handleBaseChange = (apiConfig: TApiConfig) => {
    if (
      isNewApi &&
      !activeApi.url &&
      confirm('新建接口口马上前往编辑接口mock数据?')
    ) {
      setActiveTab('scenes');
    }
    onChange(apiConfig);
  };

  const tabs = [
    <Tabs.TabPane disabled={!activeApi.url} key="scenes" tab="接口mock数据配置">
      <ApiSceneForm onChange={handleScenesChange} scenes={activeApi.scenes} />
    </Tabs.TabPane>,
    <Tabs.TabPane key="base" tab="接口基础配置">
      <ApiBaseForm activeApi={activeApi} onChange={handleBaseChange} />
    </Tabs.TabPane>,
  ];
  return (
    <div
      style={{
        height: '500px',
        overflow: 'auto',
      }}
    >
      <Tabs activeKey={activeTab} onTabClick={setActiveTab}>
        {isNewApi ? tabs.reverse() : tabs}
      </Tabs>
    </div>
  );
};

export default Apieditor;
