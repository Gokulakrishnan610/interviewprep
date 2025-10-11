export type Styles = {
  button: string;
  'form-control': string;
  list: string;
};

export type UnprefixedClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
