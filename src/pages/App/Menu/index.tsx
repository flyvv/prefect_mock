import { CSSProperties, useRef, useState } from 'react';
import cls from 'classnames';

import { Menu, Button, Modal, Form, Input } from 'antd';

import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import { createId } from '../../../utils/index';

import { ProjectItem } from '../../types/config';

import './index.less';
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

  const [editProjectId, seteditProjectId] = useState<string>();
  const uploadInput = useRef<HTMLInputElement>(null);

  // const lactiveProjectKey, setProjectactivekey! . usestatel);

  const [activeProject, setActiveProject] = useState<ProjectItem>({});

  function createProject({ name, desc }) {
    updateProject({ id: editProjectId, name, desc });
    onCloseModal();
  }

  function onProjectChange(key) {
    updateActiveProject({ id: key });
  }

  function onEditProject(item) {
    seteditProjectId(item.id);
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
    seteditProjectId(undefined);
    setActiveProject({});
  }

  // @ts-ignore
  const selectedKeys: [string] = [projects.find((p) => p.active)?.id];

  return (
    <nav className={className} style={style}>
      <Menu
        selectedKeys={selectedKeys}
        onClick={({ key }) => {
          onProjectChange(key);
        }}
      >
        {projects.length
          ? projects.map((item) => (
              <Menu.Item key={item.id} className="project-item">
                &nbsp;&nbsp;{item.name}
                <Button.Group
                  className={cls('project-action', 'projectAction')}
                  size="small"
                >
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => {
                      onEditProject(item);
                    }}
                  />
                  <Button
                    disabled={projects.length === 1}
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      onDeleteProject(item.id);
                    }}
                  />
                </Button.Group>
              </Menu.Item>
            ))
          : null}
      </Menu>
      <div style={{ textAlign: 'center' }}>
        <Button
          type="ghost"
          onClick={() => {
            seteditProjectId(createId());
          }}
        >
          添加项目
        </Button>
        <Button
          type="ghost"
          onClick={() => {
            uploadInput.current?.click();
          }}
        >
          导入
        </Button>
      </div>
      <input
        hidden
        type="file"
        ref={uploadInput}
        accept=".json"
        onChange={(event) => {
          const reader = new FileReader();
          if (!event.target.files?.length) return;
          reader.readAsText(event.target.files[0], 'UTF-8');
          reader.onload = (evt) => {
            const fileString = evt.target?.result;
            if (!fileString) return;
            const importInfo = JSON.parse(fileString as string);
            const projectIndex = projects.findIndex(
              (p) => p.id == importInfo.exportProject.id,
            );
            if (projectIndex !== -1) {
              if (
                confirm(
                  `导入项目${importInfo.exportProject.name}本地已经存在，是否替换?`,
                )
              ) {
                projects[projectIndex] = importInfo.exportProject;
              } else {
                importInfo.exportProject.id = createId();
                projects.push(importInfo.exportProject);
              }
            } else {
              projects.push(importInfo.exportProject);
            }
            updateProjects(projects);
            event.target.value = '';
          };
        }}
      />
      <Modal
        destroyOnClose
        visible={!!editProjectId}
        title={isEmpty(activeProject) ? '添加项目' : '编辑项目'}
        footer={null}
        onCancel={() => onCloseModal()}
      >
        <Form labelCol={{ span: 4 }} onFinish={createProject}>
          <Form.Item
            label="项目名称"
            name="name"
            initialValue={activeProject.name}
            rules={[{ required: true, message: '填写项目名称' }]}
          >
            <Input placeholder="填写项目名称" />
          </Form.Item>

          <Form.Item
            label="项目简介"
            name="desc"
            initialValue={activeProject.desc}
          >
            <Input.TextArea placeholder="项目描述" />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 4 }}>
            <Button type="primary" htmlType="submit">
              {isEmpty(activeProject) ? '提交' : '更新'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </nav>
  );
}
