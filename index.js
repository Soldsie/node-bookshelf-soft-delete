'use strict';

function shouldDisable(opts) {
  return opts && opts.hasOwnProperty('softDelete') && !opts.softDelete;
}

function addDeletionCheck(syncable, softField) {
  syncable.query(function (qb) {
    qb.where(function () {
      this.whereNull(softField);
    });
  });
}

module.exports = function (Bookshelf) {
  var mProto = Bookshelf.Model.prototype;
  var cProto = Bookshelf.Collection.prototype;

  Bookshelf.Model = Bookshelf.Model.extend({

    initialize: function () {
      if (typeof this.soft === 'string') {
        this.softField = this.soft;
      } else {
        this.softField = 'deleted_at';
      }

      return mProto.initialize.apply(this, arguments);
    },

    fetch: function (opts) {
      if (this.soft && !shouldDisable(opts)) {
        addDeletionCheck(this, this.softField);
      }

      return mProto.fetch.apply(this, arguments);
    },

    fetchAll: function (opts) {
      if (this.soft && !shouldDisable(opts)) {
        addDeletionCheck(this, this.softField);
      }

      return mProto.fetchAll.apply(this, arguments);
    },

    restore: function () {
      if (this.soft) {
        if (this.get(this.softField)) {
          this.set(this.softField, null);
          return this.save();
        }
      } else {
        throw new TypeError('model must have soft-delete enabled to be restored');
      }
    },

    destroy: function (opts) {
      if (this.soft && !shouldDisable(opts)) {
        this.set(this.softField, new Date());
        return this.save()
          .tap(function (model) {
            return model.triggerThen('destroying', model, opts);
          })
          .then(function (model) {
            return model.triggerThen('destroyed', model, undefined, opts);
          });
      } else {
        return mProto.destroy.apply(this, arguments);
      }
    }

  });

  Bookshelf.Collection = Bookshelf.Collection.extend({

    fetch: function (opts) {
      /*eslint-disable new-cap*/
      var model = (new this.model());
      /*eslint-enable new-cap*/
      var isSoft = model.soft;
      if (isSoft && !shouldDisable(opts)) {
        addDeletionCheck(this, model.softField);
      }
      return cProto.fetch.apply(this, arguments);
    }

  });
};
