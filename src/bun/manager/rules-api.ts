/**
 * Rules Manager API
 * Provides a simplified API for managing rules (manual management focus)
 * Similar to PluginManagerAPI but for rule operations
 */

import { RulePersistence } from "trigger_system/node";
import type { TriggerRule } from "trigger_system/node";
import { RuleBuilder } from "trigger_system/node";
import { randomUUID } from "crypto";
interface DefaultRuleOptions{
  event:string;
  name?:string;
  description?:string;
  enabled?:boolean;
  tags?:string[];
  filePath?:string;
}
function DefaultRule({event,name,description,enabled,tags}:DefaultRuleOptions){
  const rule = new RuleBuilder()
  .on(event)
  .withId(randomUUID())
  .withName(name || "Default Rule")
  .withDescription(description || "Default rule")
  .withEnabled(enabled || true)
  .withTags(tags || [])
  .do('log',{
    message: `${event} triggered`
  })
  .build();
  return rule;
}
export interface RulesManagerAPI {
  // Loading
  loadRulesFromDir(dirPath: string): Promise<TriggerRule[]>;
  loadRulesFromFile(filePath: string): Promise<TriggerRule[]>;

  // Saving
  saveRule(rule: TriggerRule, filePath: string): Promise<void>;
  saveAllRules(rules: TriggerRule[], baseDir: string, getFilePath?: (ruleId: string) => string): Promise<string[]>;
  saveRulesToFile(rules: TriggerRule[], filePath: string): Promise<void>;

  // Deletion
  deleteRule(filePath: string): Promise<boolean>;

  // Utilities
  ruleExists(filePath: string): boolean;
  ensureRulesDir(dirPath: string): void;
  getRuleRawContent(filePath: string): Promise<string>;
  createDefaultRule(options: DefaultRuleOptions, write?: boolean): TriggerRule;
}

/**
 * Rules Manager API instance
 */
export const rulesAPI: RulesManagerAPI = {
  /**
   * Load rules from a directory (recursive)
   */
  loadRulesFromDir: async (dirPath: string): Promise<TriggerRule[]> => {
    console.log(`[RulesAPI] Loading rules from directory: ${dirPath}`);
    try {
      const rules = await RulePersistence.loadFromDir(dirPath);
      console.log(`[RulesAPI] Loaded ${rules.length} rules from ${dirPath}`);
      return rules;
    } catch (error) {
      console.error(`[RulesAPI] Failed to load rules from directory: ${dirPath}`, error);
      throw error;
    }
  },

  /**
   * Load rules from a single file
   */
  loadRulesFromFile: async (filePath: string): Promise<TriggerRule[]> => {
    console.log(`[RulesAPI] Loading rules from file: ${filePath}`);
    try {
      const rules = await RulePersistence.loadFile(filePath);
      console.log(`[RulesAPI] Loaded ${rules.length} rules from ${filePath}`);
      return rules;
    } catch (error) {
      console.error(`[RulesAPI] Failed to load rules from file: ${filePath}`, error);
      throw error;
    }
  },

  /**
   * Save a rule to file
   */
  saveRule: async (rule: TriggerRule, filePath: string): Promise<void> => {
    console.log(`[RulesAPI] Saving rule ${rule.id} to: ${filePath}`);
    try {
      await RulePersistence.saveRule(rule, filePath);
      console.log(`[RulesAPI] Successfully saved rule ${rule.id}`);
    } catch (error) {
      console.error(`[RulesAPI] Failed to save rule ${rule.id}:`, error);
      throw error;
    }
  },
  saveRulesToFile: async (rules: TriggerRule[], filePath: string): Promise<void> => {
    console.log(`[RulesAPI] Saving ${rules.length} rules to file: ${filePath}`);
    try {
      await RulePersistence.saveRulesToFile(rules, filePath);
      console.log(`[RulesAPI] Successfully saved ${rules.length} rules to ${filePath}`);
    } catch (error) {
      console.error(`[RulesAPI] Failed to save rules to file: ${filePath}`, error);
      throw error;
    }
  },
  /**
   * Save multiple rules
   */
  saveAllRules: async (
    rules: TriggerRule[],
    baseDir: string,
    getFilePath?: (ruleId: string) => string
  ): Promise<string[]> => {
    console.log(`[RulesAPI] Saving ${rules.length} rules to base dir: ${baseDir}`);
    try {
      const filePaths = await RulePersistence.saveAll(rules, baseDir, getFilePath);
      console.log(`[RulesAPI] Successfully saved ${filePaths.length} rule files`);
      return filePaths;
    } catch (error) {
      console.error(`[RulesAPI] Failed to save rules:`, error);
      throw error;
    }
  },

  /**
   * Delete a rule file
   */
  deleteRule: async (filePath: string): Promise<boolean> => {
    console.log(`[RulesAPI] Deleting rule file: ${filePath}`);
    try {
      const result = await RulePersistence.deleteFile(filePath);
      if (result) {
        console.log(`[RulesAPI] Successfully deleted rule file`);
      } else {
        console.warn(`[RulesAPI] Rule file not found or could not be deleted: ${filePath}`);
      }
      return result;
    } catch (error) {
      console.error(`[RulesAPI] Failed to delete rule file:`, error);
      throw error;
    }
  },

  /**
   * Check if rule file exists
   */
  ruleExists: (filePath: string): boolean => {
    const exists = RulePersistence.fileExists(filePath);
    console.log(`[RulesAPI] Rule file exists check: ${filePath} -> ${exists}`);
    return exists;
  },

  /**
   * Ensure rules directory exists
   */
  ensureRulesDir: (dirPath: string): void => {
    console.log(`[RulesAPI] Ensuring directory exists: ${dirPath}`);
    RulePersistence.ensureDir(dirPath);
  },

  /**
   * Get raw content of a rule file
   */
  getRuleRawContent: async (filePath: string): Promise<string> => {
    console.log(`[RulesAPI] Getting raw content from: ${filePath}`);
    try {
      const file = Bun.file(filePath);
      return await file.text();
    } catch (error) {
      console.error(`[RulesAPI] Failed to get raw content from: ${filePath}`, error);
      throw error;
    }
  },
  /**
   * Create a default rule
   */
  createDefaultRule: (options: DefaultRuleOptions,write:boolean=false): TriggerRule => {
    try {
      const rule = DefaultRule(options);
      const filePath = options.filePath || `${options.event}`;
      if(write){
        rulesAPI.saveRule(rule,filePath);
      }
      return rule;
    } catch (error) {
      console.error(`[RulesAPI] Failed to create default rule:`, error);
      throw error;
    }
  },
};

export default rulesAPI;
