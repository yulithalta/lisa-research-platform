import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

interface LoadingAnimationProps {
  type?: "spinner" | "dots" | "progress" | "success";
  text?: string;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  showText?: boolean;
  progress?: number; // For progress type (0-100)
}

const colorClasses = {
  primary: "text-primary",
  secondary: "text-gray-500",
  success: "text-green-500",
  warning: "text-amber-500",
  error: "text-red-500"
};

const sizeClasses = {
  sm: {
    container: "h-8 gap-2",
    icon: "h-4 w-4",
    text: "text-xs",
    dots: "h-1 w-1",
    progress: "h-1"
  },
  md: {
    container: "h-16 gap-3",
    icon: "h-8 w-8",
    text: "text-sm",
    dots: "h-2 w-2",
    progress: "h-2"
  },
  lg: {
    container: "h-24 gap-4",
    icon: "h-12 w-12",
    text: "text-base",
    dots: "h-3 w-3",
    progress: "h-3"
  }
};

export function LoadingAnimation({
  type = "spinner",
  text = "Loading...",
  size = "md",
  color = "primary",
  showText = true,
  progress = 0
}: LoadingAnimationProps) {
  // Ensure progress is between 0 and 100
  const safeProgress = Math.min(100, Math.max(0, progress));
  
  // Animation variants
  const spinTransition = {
    repeat: Infinity,
    ease: "linear",
    duration: 1
  };
  
  const dotVariants = {
    initial: { scale: 0.5, opacity: 0.2 },
    animate: { scale: 1, opacity: 1 }
  };
  
  const staggeredDots = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Spinner */}
      {type === "spinner" && (
        <div className={`flex flex-col items-center ${sizeClasses[size].container}`}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={spinTransition}
            className={`${colorClasses[color]}`}
          >
            <Loader2 className={sizeClasses[size].icon} />
          </motion.div>
          
          {showText && (
            <span className={`${sizeClasses[size].text} ${colorClasses[color]}`}>
              {text}
            </span>
          )}
        </div>
      )}
      
      {/* Dots */}
      {type === "dots" && (
        <div className={`flex flex-col items-center ${sizeClasses[size].container}`}>
          <motion.div 
            className="flex space-x-2"
            variants={staggeredDots}
            initial="initial"
            animate="animate"
          >
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className={`${sizeClasses[size].dots} rounded-full ${colorClasses[color]}`}
                variants={dotVariants}
                animate={{ scale: [0.5, 1, 0.5], opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.2 }}
              />
            ))}
          </motion.div>
          
          {showText && (
            <span className={`${sizeClasses[size].text} ${colorClasses[color]} mt-2`}>
              {text}
            </span>
          )}
        </div>
      )}
      
      {/* Progress bar */}
      {type === "progress" && (
        <div className={`flex flex-col items-center w-full max-w-md ${sizeClasses[size].container}`}>
          <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size].progress}`}>
            <motion.div
              className={`h-full ${colorClasses[color]} bg-current`}
              initial={{ width: "0%" }}
              animate={{ width: `${safeProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {showText && (
            <div className="flex justify-between w-full mt-2">
              <span className={`${sizeClasses[size].text} ${colorClasses[color]}`}>
                {text}
              </span>
              <span className={`${sizeClasses[size].text} ${colorClasses[color]}`}>
                {safeProgress}%
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Success animation */}
      {type === "success" && (
        <div className={`flex flex-col items-center ${sizeClasses[size].container}`}>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`${colorClasses.success}`}
          >
            <CheckCircle2 className={sizeClasses[size].icon} />
          </motion.div>
          
          {showText && (
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${sizeClasses[size].text} text-green-500`}
            >
              {text || "Completed!"}
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
}