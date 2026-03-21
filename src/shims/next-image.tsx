import React from "react";

const Image = React.forwardRef<HTMLImageElement, any>(
  ({ src, alt, width, height, fill, priority, fetchPriority, ...props }, ref) => (
    <img
      ref={ref}
      src={typeof src === "object" && src?.src ? src.src : src}
      alt={alt || ""}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      style={fill ? { objectFit: "cover", width: "100%", height: "100%" } : undefined}
      {...props}
    />
  )
);
Image.displayName = "Image";

export default Image;
