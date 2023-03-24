require 'dotenv'
require "aws-sdk-ssm"

module Stack
  class Env
    @@client = nil
    @@loadedVariables = {}

    def self.get_client
      unless @@client
        @@client = Aws::SSM::Client.new
      end
      @@client
    end

    # @param [String] key
    # @return [String]
    def self.get_env(key)
      unless @@loadedVariables[key]
        value = ENV[key]
        if value&.include? 'ssm:'
          parameter_name = value.gsub('ssm:', '')
          puts "Fetching parameter #{parameter_name} from parameter store"
          value = self.get_client.get_parameter({ name: parameter_name, with_decryption: true }).parameter.value
          ENV[key] = value
          @@loadedVariables[key] = ENV[key]
        else
          @@loadedVariables[key] = value
        end
      end
      if @@loadedVariables[key] == nil
        raise "Undefined ENV variable referenced: #{key}"
      end
      return @@loadedVariables[key]
    end

    # @param [String[]] keys
    def self.load_envs(keys)
      keys.each do |key|
        ENV[key] = self.get_env(key)
      end
    end

    def self.ENVIRONMENT_NAME
      self.get_env('ENVIRONMENT_NAME')
    end

    def self.BUILD_TYPE
      self.get_env('BUILD_TYPE')
    end

    def self.APPENV
      self.get_env('APPENV')
    end

    def self.APP_ID
      self.get_env('APP_ID')
    end

    def self.MATCH_TYPE
      self.get_env('MATCH_TYPE')
    end

    def self.TARGET_NAME
      self.get_env('TARGET_NAME')
    end

    def self.APIURL
      self.get_env('APIURL')
    end

    def self.SENTRY_DSN
      self.get_env('SENTRY_DSN')
    end

    def self.SENTRY_AUTH_TOKEN
      self.get_env('SENTRY_AUTH_TOKEN')
    end

    def self.CODEPUSH_DEPLOYMENTKEY_ANDROID
      self.get_env('CODEPUSH_DEPLOYMENTKEY_ANDROID')
    end

    def self.CODEPUSH_DEPLOYMENTKEY_IOS
      self.get_env('CODEPUSH_DEPLOYMENTKEY_IOS')
    end

    def self.ITUNES_CONNECT_TEAM_ID
      self.get_env('ITUNES_CONNECT_TEAM_ID')
    end

    def self.APPLE_DEVELOPER_TEAM_ID
      self.get_env('APPLE_DEVELOPER_TEAM_ID')
    end

    def self.APPLE_ID
      self.get_env('APPLE_ID')
    end

    def self.APPLE_ID_PASSWORD
      self.get_env('APPLE_ID_PASSWORD')
    end

    def self.SLACK_ERROR_WEBHOOK
      self.get_env('SLACK_ERROR_WEBHOOK')
    end

    def self.SLACK_RELEASE_WEBHOOK
      self.get_env('SLACK_RELEASE_WEBHOOK')
    end

    def self.MATCH_PASSWORD
      self.get_env('MATCH_PASSWORD')
    end
  end

end

