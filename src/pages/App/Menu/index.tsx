import { CSSProperties, useRef, useState } from 'react';
import cls from 'classnames';

import { Menu, Button, Modal, Form, Input } from 'antd';

import { DeleteOutlined, Editoutlined } from '@ant-design/icons';

import { createId } from '../../utils';

import { Projectitem } from '@/types/config';

import isty from './index.module.scss';
import { isEmpty } from 'lodash';

import {
  updateProject,
  removeProject,
  updateActiveProject,
  updateProjects,
} from '../../../utils/action';

interface IMenuProps {
  className?: string;
  projects: IProject[];
  style?: CSSProperties;
}
export default function PageNenu(props: IMenuProps) {
  const { className, style = {}, projects } = props;

  const [editProjectid, setEditProjectid] = useState<string>();
  const uploadinput = useRef<HTMLInputElement>(null);

  // const lactiveProjectKey, setProjectactivekey! . usestatel);

  const [activeProject, setActiveProject] = useState<ProjectItem>({});

  function createProject({ name, desc }) {
    updateProject({ id: editProjectid, name, desc });
    onCloseModal();
  }

  function onProjectChange(key) {
    updateActiveProject({ id: key });
  }

  function onEditProject(item) {
    setEditProjectid(item.id);
    setActiveProject(item);
  }

  function onDeleteProject(key) {
    Modal.confirm({
      title: '别除项目',
      content: '删除操作无法缴销，确认别除?',
      onOk: () => {
        removeProject({ id: key });
      },
    });
  }
  function onCloseModal() {
    setEditProjectid(undefined);
    setActiveProject();
  }

  const selectedKeys: [string] = [projects.find((p) => p.active)?.id];
  return (
    <nav className={cls(className)} style={style}>
      <Menu
        selectedKeys={selectedKeys}
        onClick={({ key }) => {
          onProjectChange(key);
        }}
      >
        {projects.length
          ? projects.map((item) => (
              <Menu.Item key={item.id} className={style.projectItem}>
                &nbsp;&nbsp;{item.name}
                <Button.Group
                  className={cls('project-action', style.projectAction)}
                  size="small"
                >
                  <Button
                    icon={<Editoutlined />}
                    onClick={() => {
                      onEditproject(item);
                    }}
                  />
                  <Button
                    disabled={projects.length === 1}
                    icon={<DeleteDutlined />}
                    onClick={() => {
                      onDeleteProject(item.id);
                    }}
                  />
                </Button.Group>
              </Menu.Item>
            ))
          : null}
      </Menu>
    </nav>
  );
}
