type Props<T, P> = {
  data: T | undefined;
  Component: React.ComponentType<P & {data: T}>;
  props: P;
};

export const MissingData = <T, P>({data, Component, props}: Props<T, P>) => {
  return data === undefined ? <></> : <Component data={data} {...props} />;
};
