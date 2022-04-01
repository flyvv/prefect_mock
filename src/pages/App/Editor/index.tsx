import MonacoEditor, { MonacoEditorProps } from 'react-monaco-editor';
import { useEffect, useState } from 'react';
import { message, Button } from 'antd';
function Editor(props: MonacoEditorProps) {
  const [value, setValue] = useState<string | undefined | null>(
    props.defaultValue || props.value,
  );

  useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  const handleFormatValue = () => {
    setValue((val) => {
      let newVal = val;
      if (!val) return val;
      try {
        newVal = JSON.stringify(JSON.parse(val), null, '');
      } catch (e) {
        message.warn('JSON 解析出错');
      }
      return newVal;
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <Button
        style={{ position: 'absolute', top: 0, right: 0 }}
        onClick={handleFormatValue}
      >
        {' {\\}'}
      </Button>
      <MonacoEditor {...props} value={value} />
    </div>
  );
}
export default Editor;
