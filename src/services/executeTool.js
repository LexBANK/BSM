import { AppError } from "../utils/errors.js";
import { toolRegistry } from "./toolRegistry.js";

export const executeTool = async ({ toolName, args = {}, allowedTools = [] }) => {
  if (!toolName || typeof toolName !== "string") {
    throw new AppError("Invalid tool name", 400, "TOOL_NAME_INVALID");
  }

  if (!allowedTools.includes(toolName)) {
    throw new AppError(`Tool not allowed: ${toolName}`, 403, "TOOL_NOT_ALLOWED");
  }

  const tool = toolRegistry.get(toolName);
  if (!tool) {
    throw new AppError(`Tool not registered: ${toolName}`, 400, "TOOL_NOT_REGISTERED");
  }

  return tool(args);
};
