import { useToast } from "./use-toast";

export const useAutoDismissToast = () => {
  const { toast } = useToast();

  const autoDismissToast = (props: Parameters<typeof toast>[0]) => {
    const { id, dismiss } = toast(props);
    
    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      dismiss();
    }, 2000);

    return { id, dismiss };
  };

  return { autoDismissToast };
};