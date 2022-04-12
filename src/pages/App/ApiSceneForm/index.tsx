import { Tabs } from 'antd';
import { useCallback, useState } from 'react';
import { SceneEditor } from './SceneEditor';
// import { IScene } from '@/types';
import { createId } from '../../../utils/index';
import produce from 'immer';

interface IProps {
  scenes: IScene[];
  onChange: (value: IScene[]) => void;
}

const useApi = (originScenes, onChange) => {
  const [scenes, setScenes] = useState<IScene[]>(originScenes);
  const updateApi = (arg) => {
    let newState = arg;
    if (typeof arg === 'function') {
      newState = arg(scenes || []);
    }
    setScenes(newState);
    onChange(newState);
  };

  return { scenes, updateApi };
};

/**
 * *API 场景tab编辑
 */
export function ApiSceneForm(props: IProps) {
  const { scenes, updateApi } = useApi(props.scenes, props.onChange);

  const handleEdit = (id, actionType) => {
    switch (actionType) {
      case 'add': {
        const name = prompt('请输入接口场景名称');
        if (name) {
          updateApi((state) => [
            ...state,
            {
              name,
              id: createId(),
            },
          ]);
        }
        break;
      }
      case 'remove':
        if (confirm('确认删除该场景?删除后无法恢复')) {
          updateApi((state) => {
            const index = state.findIndex((i) => i.id === id);
            return produce(state, (draft) => {
              draft.splice(index, 1);
              return draft;
            });
          });
        }
        break;
    }
  };
  const handleSceneUpdate = useCallback(
    (newScene) => {
      updateApi((state) =>
        produce(state, (draft) => {
          const currentIndex = scenes.findIndex((s) => s.id == newScene.id);
          if (currentIndex === -1) {
            draft.push(newScene);
          } else {
            draft[currentIndex] = newScene;
          }
          return draft;
        }),
      );
    },
    [updateApi],
  );

  return (
    <div>
      <Tabs type="editable-card" onEdit={handleEdit}>
        {scenes?.map((scene) => (
          <Tabs.TabPane tab={scene.name} key={scene.id}>
            <SceneEditor onSubmit={handleSceneUpdate} scene={scene} />
          </Tabs.TabPane>
        ))}
      </Tabs>
      {!scenes?.length && (
        <div>
          <h4>本工具支持复杂的数据mock能力国</h4>
          <ul>
            <li>
              数据以场景维度管理，
              点击"+"添加响应数据的场景。如模拟接口AB能力，可以创建A场景响应数据和B场景响应数据，在接口列表页中快速切换。
            </li>
            <li>
              数据在同一场景下支持入参匹配，在匹配不同入参响应不同的出参(如筛选、分页等)
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
