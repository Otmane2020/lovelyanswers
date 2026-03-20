import React from "react";

const Link = React.forwardRef<HTMLAnchorElement, any>(
  ({ href, children, ...props }, ref) => (
    <a ref={ref} href={href} {...props}>
      {children}
    </a>
  )
);
Link.displayName = "Link";

export default Link;
