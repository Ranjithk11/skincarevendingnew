declare module "*.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "react-simple-keyboard/build/css/index.css" {
  const css: string;
  export default css;
}
