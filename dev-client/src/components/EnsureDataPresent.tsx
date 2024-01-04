type Props<T, PropsWithoutData> = {
  data: T | undefined;
  Component: React.ComponentType<PropsWithoutData & {data: T}>;
  props: PropsWithoutData;
};

export const EnsureDataPresent = <T, P>({
  data,
  Component,
  props,
}: Props<T, P>) => {
  return data === undefined ? <></> : <Component data={data} {...props} />;
};
