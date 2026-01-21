"""
AI Agent Configuration Manager
Provides high-level control over AI agent behavior
"""

import json
import os
from typing import Dict, Optional


class AIAgentConfig:
    """Configuration manager for AI agents"""

    DEFAULT_CONFIG_PATH = "config/ai_agent_config.json"

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize configuration

        Args:
            config_path: Path to config file (optional)
        """
        self.config_path = config_path or self.DEFAULT_CONFIG_PATH
        self.config = self._load_config()

    def _load_config(self) -> Dict:
        """Load configuration from file"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    return json.load(f)
            else:
                print(f"[CONFIG] Config file not found: {self.config_path}")
                return self._get_default_config()
        except Exception as e:
            print(f"[CONFIG] Error loading config: {e}")
            return self._get_default_config()

    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            "ai_agents": {
                "enabled": True,
                "model": "llama3.2:3b",
                "temperature": 0.3,
                "contact_filter": {
                    "enabled": True,
                    "min_confidence": 0.6
                },
                "quality_assessment": {
                    "enabled": True,
                    "min_quality_score": 0.5
                }
            }
        }

    def save_config(self) -> bool:
        """Save configuration to file"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            print(f"[CONFIG] Saved configuration to {self.config_path}")
            return True
        except Exception as e:
            print(f"[CONFIG] Error saving config: {e}")
            return False

    # ==================== GETTERS ====================

    def is_enabled(self) -> bool:
        """Check if AI agents are enabled"""
        return self.config.get('ai_agents', {}).get('enabled', True)

    def get_model(self) -> str:
        """Get AI model name"""
        return self.config.get('ai_agents', {}).get('model', 'llama3.2:3b')

    def get_temperature(self) -> float:
        """Get model temperature"""
        return self.config.get('ai_agents', {}).get('temperature', 0.3)

    def get_timeout(self) -> int:
        """Get request timeout"""
        return self.config.get('ai_agents', {}).get('timeout', 30)

    # Contact Filter
    def is_contact_filter_enabled(self) -> bool:
        """Check if contact filtering is enabled"""
        return self.config.get('ai_agents', {}).get('contact_filter', {}).get('enabled', True)

    def get_contact_filter_min_confidence(self) -> float:
        """Get minimum confidence for contact filter"""
        return self.config.get('ai_agents', {}).get('contact_filter', {}).get('min_confidence', 0.6)

    def is_aggressive_mode(self) -> bool:
        """Check if aggressive filtering is enabled"""
        return self.config.get('ai_agents', {}).get('contact_filter', {}).get('aggressive_mode', False)

    # Quality Assessment
    def is_quality_assessment_enabled(self) -> bool:
        """Check if quality assessment is enabled"""
        return self.config.get('ai_agents', {}).get('quality_assessment', {}).get('enabled', True)

    def get_min_quality_score(self) -> float:
        """Get minimum quality score"""
        return self.config.get('ai_agents', {}).get('quality_assessment', {}).get('min_quality_score', 0.5)

    def should_prioritize_decision_makers(self) -> bool:
        """Check if decision makers should be prioritized"""
        return self.config.get('ai_agents', {}).get('quality_assessment', {}).get('prioritize_decision_makers', True)

    # Company Categorization
    def is_company_categorization_enabled(self) -> bool:
        """Check if company categorization is enabled"""
        return self.config.get('ai_agents', {}).get('company_categorization', {}).get('enabled', True)

    def get_min_fit_score(self) -> float:
        """Get minimum company fit score"""
        return self.config.get('ai_agents', {}).get('company_categorization', {}).get('min_fit_score', 0.5)

    def is_strict_manufacturing_only(self) -> bool:
        """Check if only strict manufacturing companies are accepted"""
        return self.config.get('ai_agents', {}).get('company_categorization', {}).get('strict_manufacturing_only', False)

    # Priority Scoring
    def is_priority_scoring_enabled(self) -> bool:
        """Check if priority scoring is enabled"""
        return self.config.get('ai_agents', {}).get('priority_scoring', {}).get('enabled', True)

    def get_high_priority_threshold(self) -> float:
        """Get high priority threshold"""
        return self.config.get('ai_agents', {}).get('priority_scoring', {}).get('high_priority_threshold', 7.5)

    # Performance
    def is_parallel_processing_enabled(self) -> bool:
        """Check if parallel processing is enabled"""
        return self.config.get('ai_agents', {}).get('performance', {}).get('parallel_processing', True)

    def get_max_concurrent_requests(self) -> int:
        """Get max concurrent requests"""
        return self.config.get('ai_agents', {}).get('performance', {}).get('max_concurrent_requests', 10)

    def get_batch_size(self) -> int:
        """Get batch size for processing"""
        return self.config.get('ai_agents', {}).get('performance', {}).get('batch_size', 20)

    # Logging
    def is_verbose_logging(self) -> bool:
        """Check if verbose logging is enabled"""
        return self.config.get('ai_agents', {}).get('logging', {}).get('verbose', True)

    def should_log_decisions(self) -> bool:
        """Check if decisions should be logged"""
        return self.config.get('ai_agents', {}).get('logging', {}).get('log_decisions', True)

    # ==================== SETTERS ====================

    def set_enabled(self, enabled: bool):
        """Enable/disable AI agents"""
        if 'ai_agents' not in self.config:
            self.config['ai_agents'] = {}
        self.config['ai_agents']['enabled'] = enabled

    def set_model(self, model: str):
        """Set AI model"""
        if 'ai_agents' not in self.config:
            self.config['ai_agents'] = {}
        self.config['ai_agents']['model'] = model

    def set_temperature(self, temperature: float):
        """Set model temperature"""
        if 'ai_agents' not in self.config:
            self.config['ai_agents'] = {}
        self.config['ai_agents']['temperature'] = temperature

    def set_contact_filter_min_confidence(self, confidence: float):
        """Set minimum confidence for contact filter"""
        if 'ai_agents' not in self.config:
            self.config['ai_agents'] = {}
        if 'contact_filter' not in self.config['ai_agents']:
            self.config['ai_agents']['contact_filter'] = {}
        self.config['ai_agents']['contact_filter']['min_confidence'] = confidence

    def set_min_quality_score(self, score: float):
        """Set minimum quality score"""
        if 'ai_agents' not in self.config:
            self.config['ai_agents'] = {}
        if 'quality_assessment' not in self.config['ai_agents']:
            self.config['ai_agents']['quality_assessment'] = {}
        self.config['ai_agents']['quality_assessment']['min_quality_score'] = score

    def set_aggressive_mode(self, aggressive: bool):
        """Enable/disable aggressive filtering"""
        if 'ai_agents' not in self.config:
            self.config['ai_agents'] = {}
        if 'contact_filter' not in self.config['ai_agents']:
            self.config['ai_agents']['contact_filter'] = {}
        self.config['ai_agents']['contact_filter']['aggressive_mode'] = aggressive

    # ==================== PRESETS ====================

    def apply_preset(self, preset_name: str) -> bool:
        """
        Apply a configuration preset

        Args:
            preset_name: 'aggressive', 'balanced', or 'lenient'

        Returns:
            Success status
        """
        presets = self.config.get('presets', {})
        if preset_name not in presets:
            print(f"[CONFIG] Preset '{preset_name}' not found")
            return False

        preset = presets[preset_name]

        # Apply preset settings
        if 'contact_filter' in preset:
            for key, value in preset['contact_filter'].items():
                self.config['ai_agents']['contact_filter'][key] = value

        if 'quality_assessment' in preset:
            for key, value in preset['quality_assessment'].items():
                self.config['ai_agents']['quality_assessment'][key] = value

        print(f"[CONFIG] Applied preset: {preset_name}")
        return True

    def get_available_presets(self) -> Dict:
        """Get all available presets"""
        return self.config.get('presets', {})

    # ==================== EXPORT/IMPORT ====================

    def export_config(self) -> Dict:
        """Export current configuration"""
        return self.config.copy()

    def import_config(self, config: Dict):
        """Import configuration"""
        self.config = config

    def reset_to_defaults(self):
        """Reset configuration to defaults"""
        self.config = self._get_default_config()

    # ==================== STATISTICS ====================

    def get_config_summary(self) -> Dict:
        """Get configuration summary"""
        return {
            'enabled': self.is_enabled(),
            'model': self.get_model(),
            'temperature': self.get_temperature(),
            'filters': {
                'contact_filter': self.is_contact_filter_enabled(),
                'quality_assessment': self.is_quality_assessment_enabled(),
                'company_categorization': self.is_company_categorization_enabled(),
                'priority_scoring': self.is_priority_scoring_enabled()
            },
            'thresholds': {
                'contact_confidence': self.get_contact_filter_min_confidence(),
                'quality_score': self.get_min_quality_score(),
                'company_fit': self.get_min_fit_score(),
                'high_priority': self.get_high_priority_threshold()
            },
            'performance': {
                'parallel_processing': self.is_parallel_processing_enabled(),
                'max_concurrent': self.get_max_concurrent_requests(),
                'batch_size': self.get_batch_size()
            }
        }


# Global config instance
_global_config = None

def get_config() -> AIAgentConfig:
    """Get global configuration instance"""
    global _global_config
    if _global_config is None:
        _global_config = AIAgentConfig()
    return _global_config

def reload_config():
    """Reload configuration from file"""
    global _global_config
    _global_config = AIAgentConfig()
    return _global_config
