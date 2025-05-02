import { Button } from "@/components/ui/button";
import { AlertCircle, Cloud, FileQuestion, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";

type ErrorType = "connection" | "notFound" | "server" | "permission" | "default";

const errorIllustrations = {
  connection: <WifiOff className="h-20 w-20 text-red-500" />,
  notFound: <FileQuestion className="h-20 w-20 text-amber-500" />,
  server: <Cloud className="h-20 w-20 text-blue-500" />,
  permission: <AlertCircle className="h-20 w-20 text-purple-500" />,
  default: <AlertCircle className="h-20 w-20 text-gray-500" />
};

const errorTitles = {
  connection: "Connection Error",
  notFound: "Not Found",
  server: "Server Error",
  permission: "Access Denied",
  default: "Something Went Wrong"
};

const errorDescriptions = {
  connection: "We couldn't connect to the server. Please check your internet connection and try again.",
  notFound: "The resource you're looking for doesn't exist or has been moved.",
  server: "Our server is having issues. Please try again later.",
  permission: "You don't have permission to access this resource.",
  default: "An unexpected error occurred. Please try again."
};

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
}

export function ErrorState({
  type = "default",
  title,
  description,
  action,
  actionLabel = "Try Again"
}: ErrorStateProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div 
        className="bg-gray-50 dark:bg-gray-800 rounded-full p-6 mb-6 border border-gray-200 dark:border-gray-700"
        variants={item}
        whileHover={{ scale: 1.05, rotate: [0, -5, 5, -5, 0] }}
      >
        {errorIllustrations[type]}
      </motion.div>
      
      <motion.h3
        className="text-xl font-bold mb-2"
        variants={item}
      >
        {title || errorTitles[type]}
      </motion.h3>
      
      <motion.p
        className="text-gray-500 dark:text-gray-400 mb-6 max-w-md"
        variants={item}
      >
        {description || errorDescriptions[type]}
      </motion.p>
      
      {action && (
        <motion.div variants={item}>
          <Button
            onClick={action}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}