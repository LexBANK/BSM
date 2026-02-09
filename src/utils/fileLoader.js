import { readFile, access } from "fs/promises";
import { constants } from "fs";
import path from "path";
import YAML from "yaml";
import { AppError } from "./errors.js";

/**
 * Safely loads and parses a JSON file
 * @param {string} filePath - Path to JSON file
 * @param {string} errorContext - Context for error message
 * @returns {Promise<any>} Parsed JSON content
 */
export const loadJsonFile = async (filePath, errorContext = "JSON file") => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    throw new AppError(
      `Failed to load ${errorContext}: ${err.message}`,
      500,
      err.code || "FILE_LOAD_FAILED"
    );
  }
};

/**
 * Safely loads and parses a YAML file
 * @param {string} filePath - Path to YAML file
 * @param {string} errorContext - Context for error message
 * @returns {Promise<any>} Parsed YAML content
 */
export const loadYamlFile = async (filePath, errorContext = "YAML file") => {
  try {
    const content = await readFile(filePath, "utf8");
    return YAML.parse(content);
  } catch (err) {
    throw new AppError(
      `Failed to load ${errorContext}: ${err.message}`,
      500,
      err.code || "FILE_LOAD_FAILED"
    );
  }
};

/**
 * Checks if a file exists and is readable
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if file exists and is readable
 */
export const fileExists = async (filePath) => {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Loads multiple files in parallel with error handling
 * @param {string[]} files - Array of file paths
 * @param {Function} loader - Function to load each file
 * @returns {Promise<any[]>} Array of loaded content
 */
export const loadMultipleFiles = async (files, loader) => {
  return Promise.all(files.map(file => loader(file)));
};
