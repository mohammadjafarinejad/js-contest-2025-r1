import { useEffect, useRef } from "../lib/teact/teact";

const useDidMountEffect = (func: () => void, deps: any[]) => {
    const didMount = useRef(false);

    useEffect(() => {
        if (didMount.current) {
            func();
        } else {
            didMount.current = true;
        }
    }, deps);
};

export default useDidMountEffect;
