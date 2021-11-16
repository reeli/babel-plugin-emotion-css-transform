type Theme = unknown;

export const applyTheme = (...args: any[]) => {
  return (theme: Theme) => {
    const fn = (data: any[]): any => {
      return data.map((arg) => {
        if (Array.isArray(arg)) {
          return fn(arg);
        }
        return typeof arg === "function" ? arg(theme) : arg;
      });
    };

    return fn(args);
  };
};
