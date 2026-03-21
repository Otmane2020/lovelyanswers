import React from "react";
import { Link as RouterLink } from "react-router-dom";

const Link = React.forwardRef<HTMLAnchorElement, any>(
  ({ href, children, ...props }, ref) => {
    // External links use regular <a>
    if (href && (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#"))) {
      return (
        <a ref={ref} href={href} {...props}>
          {children}
        </a>
      );
    }
    return (
      <RouterLink ref={ref} to={href || "/"} {...props}>
        {children}
      </RouterLink>
    );
  }
);
Link.displayName = "Link";

export default Link;
